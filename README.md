# Base Reputation Score SBT

Mini app MVP pour Base App : l'utilisateur saisit une adresse Base/EVM, calcule un score de réputation, puis minte un SBT non transférable avec son smart wallet Base.

## Ce qui est inclus

- Next.js App Router
- Wagmi / Viem
- Connecteur `baseAccount`
- Contrat ERC-721 SBT non transférable
- Prix de mint : `0.0001 ETH`
- Paiement envoyé vers `TREASURY_ADDRESS`
- Signature serveur pour empêcher les scores arbitraires
- Metadata onchain en `tokenURI()` data URI

## Installation

```bash
npm install
```

## Configuration

Copie `.env.example` vers `.env.local` puis remplis les valeurs.

```bash
cp .env.example .env.local
```

Sous PowerShell :

```powershell
copy .env.example .env.local
```

Variables importantes :

```env
DEPLOYER_PRIVATE_KEY=0x...
ATTESTER_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0xTonWalletReceveur
NEXT_PUBLIC_CHAIN=baseSepolia
NEXT_PUBLIC_SCORE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

`TREASURY_ADDRESS` est le wallet qui reçoit les paiements de mint.

## Lancer en local

```bash
npm run dev
```

## Compiler le contrat

```bash
npm run compile
```

## Déployer sur Base Sepolia

Le wallet de `DEPLOYER_PRIVATE_KEY` doit avoir un peu d'ETH Base Sepolia.

```bash
npm run deploy:sepolia
```

Copie l'adresse du contrat affichée dans :

```env
NEXT_PUBLIC_SCORE_CONTRACT_ADDRESS=0xAdresseDuContrat
```

Puis relance :

```bash
npm run dev
```

## Flow utilisateur

1. Saisir une adresse wallet à scorer.
2. Cliquer sur `Calculate score`.
3. Connecter le smart wallet Base.
4. Cliquer sur `Mint my reputation score — 0.0001 ETH`.
5. Le SBT est minté au wallet payeur, et les fonds vont vers `TREASURY_ADDRESS`.

## Sécurité MVP

Le backend signe uniquement les scores qu'il a calculés. Le contrat vérifie :

- contrat cible
- chainId
- payeur `msg.sender`
- wallet scoré
- score
- hash du score
- version
- deadline

Le token est soulbound : il ne peut pas être transféré. Seul le mint et le burn sont autorisés au niveau ERC-721.

## Passage mainnet Base

1. Déploie le contrat :

```bash
npm run deploy:base
```

2. Mets à jour :

```env
NEXT_PUBLIC_CHAIN=base
NEXT_PUBLIC_SCORE_CONTRACT_ADDRESS=0xAdresseMainnet
```

3. Déploie sur Vercel avec les mêmes variables d'environnement.
