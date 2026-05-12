// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract BaseReputationSBT is ERC721, Ownable {
    using ECDSA for bytes32;
    using Strings for uint256;

    uint256 public constant MINT_PRICE = 0.0002 ether;

    address public attester;
    address payable public treasury;
    uint256 public nextTokenId = 1;

    struct Reputation {
        address scoredWallet;
        uint256 score;
        string category;
        bytes32 scoreHash;
        string version;
        uint256 mintedAt;
    }

    mapping(uint256 => Reputation) public reputations;
    mapping(address => uint256) public latestTokenByWallet;
mapping(bytes32 => bool) public usedNonces;

    event ReputationMinted(
        uint256 indexed tokenId,
        address indexed owner,
        address indexed scoredWallet,
        uint256 score,
        string category,
        bytes32 scoreHash,
        string version,
        uint256 mintedAt
    );

    event AttesterUpdated(address indexed attester);
    event TreasuryUpdated(address indexed treasury);

    constructor(address payable _treasury, address _attester)
        ERC721("Base Reputation Score", "BRS")
        Ownable(msg.sender)
    {
        require(_treasury != address(0), "Invalid treasury");
        require(_attester != address(0), "Invalid attester");

        treasury = _treasury;
        attester = _attester;
    }

    function mintReputationScore(
    address scoredWallet,
    uint256 score,
    string calldata category,
    bytes32 scoreHash,
    string calldata version,
    uint256 deadline,
    bytes32 nonce,
    bytes calldata signature
) external payable {
        require(scoredWallet != address(0), "Invalid scored wallet");
        require(bytes(category).length > 0 && bytes(category).length <= 40, "Invalid category");
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        require(block.timestamp <= deadline, "Signature expired");
        require(score <= 1000, "Invalid score");
require(!usedNonces[nonce], "Nonce already used");
usedNonces[nonce] = true;
bytes32 digest = keccak256(
    abi.encode(
        address(this),
        block.chainid,
        msg.sender,
        scoredWallet,
        score,
        keccak256(bytes(category)),
        scoreHash,
        keccak256(bytes(version)),
        deadline,
        nonce
    )
);

        address signer = MessageHashUtils.toEthSignedMessageHash(digest).recover(signature);
        require(signer == attester, "Invalid signature");

        uint256 tokenId = nextTokenId++;
        _mint(msg.sender, tokenId);

        reputations[tokenId] = Reputation({
            scoredWallet: scoredWallet,
            score: score,
            category: category,
            scoreHash: scoreHash,
            version: version,
            mintedAt: block.timestamp
        });

        latestTokenByWallet[scoredWallet] = tokenId;

        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Payment failed");

        emit ReputationMinted(
            tokenId,
            msg.sender,
            scoredWallet,
            score,
            category,
            scoreHash,
            version,
            block.timestamp
        );
    }

    function setAttester(address _attester) external onlyOwner {
        require(_attester != address(0), "Invalid attester");
        attester = _attester;
        emit AttesterUpdated(_attester);
    }

    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        Reputation memory rep = reputations[tokenId];
        string memory image = Base64.encode(bytes(_svg(rep.score, rep.category)));

        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"name":"Base Reputation Score #', tokenId.toString(),
                    '","description":"Soulbound onchain reputation score for Base activity. Non-transferable.",',
                    '"image":"data:image/svg+xml;base64,', image, '",',
                    '"attributes":[',
                    '{"trait_type":"Score","value":', rep.score.toString(), '},',
                    '{"trait_type":"Category","value":"', rep.category, '"},',
                    '{"trait_type":"Version","value":"', rep.version, '"},',
                    '{"trait_type":"Scored Wallet","value":"', _toAsciiString(rep.scoredWallet), '"}',
                    ']}'
                )
            )
        );

        return string.concat("data:application/json;base64,", json);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        require(from == address(0) || to == address(0), "Soulbound token");

        return super._update(to, tokenId, auth);
    }

    function _svg(uint256 score, string memory category) internal pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">',
            '<rect width="1200" height="1200" rx="80" fill="#06111f"/>',
            '<circle cx="600" cy="410" r="220" fill="#0052ff" opacity="0.9"/>',
            '<text x="600" y="260" text-anchor="middle" fill="white" font-size="64" font-family="Arial" font-weight="700">Base Reputation Score</text>',
            '<text x="600" y="455" text-anchor="middle" fill="white" font-size="190" font-family="Arial" font-weight="900">',
            score.toString(),
            '</text>',
            '<text x="600" y="720" text-anchor="middle" fill="#9cc2ff" font-size="70" font-family="Arial" font-weight="700">',
            category,
            '</text>',
            '<text x="600" y="850" text-anchor="middle" fill="#ffffff" opacity="0.65" font-size="42" font-family="Arial">Soulbound - Non-transferable</text>',
            '</svg>'
        );
    }

    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);

        s[0] = "0";
        s[1] = "x";

        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));

            s[2 + 2 * i] = _char(hi);
            s[3 + 2 * i] = _char(lo);
        }

        return string(s);
    }

    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);

        return bytes1(uint8(b) + 0x57);
    }
}