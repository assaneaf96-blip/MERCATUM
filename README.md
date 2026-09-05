# MERCATUM — Maison Lune
> Site e-commerce haut de gamme de cosmétique botanique & soins d'exception, développé avec Next.js 16, React 19 et Tailwind CSS.

---

## ✨ Fonctionnalités Principales

- 🛍️ **Boutique en ligne complète** : Catalogue de soins, tri par prix, notes, recherche instantanée et filtres par catégories.
- 🎠 **Carrousel Multimédia interactif** : Prise en charge de plusieurs photos et vidéos par produit avec navigation fluide.
- 🏛️ **Paiement par Virement Bancaire Sécurisé** : Tunnel de commande avec génération automatique de référence et copie d'IBAN en 1 clic.
- 🔐 **Espace Administration privé** (`/admin`) :
  - **Gestion du Catalogue** : Ajout, modification, suppression d'articles avec téléversement direct d'images et vidéos depuis PC ou smartphone.
  - **Gestion des Nouveautés** : Sélection et ordonnancement des articles mis en avant sur la page d'accueil.
  - **Paramètres Généraux** : Coordonnées bancaires (IBAN, BIC/SWIFT), bannière d'annonce, coordonnées de contact.
  - **Pixels Publicitaires** : Intégration et tracking automatique pour Facebook / Meta Ads, TikTok Ads, Google Ads (GTAG) et scripts personnalisés.

---

## 🚀 Démarrage Rapide

### Installation des dépendances
```bash
npm install
```

### Lancement en mode développement
```bash
npm run dev
```
Accédez au site sur [http://localhost:3000](http://localhost:3000) et à l'administration sur [http://localhost:3000/admin](http://localhost:3000/admin).

### Compilation pour la production
```bash
npm run build
npm start
```

---

## 🛠️ Stack Technique
- **Framework** : Next.js 16 (App Router & Turbopack)
- **UI / Bibliothèque** : React 19, Tailwind CSS
- **Iconographie** : Lucide React
- **Stockage & API** : API Routes Next.js (`/api/upload`) & LocalStorage sécurisé SSR
