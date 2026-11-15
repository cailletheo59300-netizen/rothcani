# Revento (nom provisoire)

SaaS pour les revendeurs Vinted. **Module 1 : stock et marges**, sans aucune connexion à Vinted.

Cahier des charges : document « Cahier des charges — Module 1 : Stock & marges » (Claude Docs).

## Ce que fait le module 1

- **Lots (arrivages)** : prix + frais de port répartis automatiquement sur chaque article (parts égales, au prorata du prix affiché, ou manuel). Rentabilité par lot.
- **Articles** : référence courte automatique (A-0001…), photos (compressées, stockage privé), circuit en 8 statuts + « Écarté », emplacement de rangement, compte de vente, historique des statuts.
- **Stock** : recherche (titre, marque, taille, référence), filtres, actions en masse (statut, emplacement, compte, suppression).
- **Ajout rapide** : photos depuis le téléphone, champs essentiels, « Enregistrer et suivant » en gardant lot / emplacement / statut.
- **Ventes** : prix réel, frais pré-remplis, marge réalisée, liste « À expédier » avec l'emplacement où récupérer l'article, bilan par mois.
- **Tableau de bord** : bénéfice et CA du mois, valeur du stock au coût d'achat, délai moyen de vente, articles dormants.
- **Réglages** : frais par défaut, comptes de vente, emplacements, fournisseurs, import CSV avec association des colonnes, export CSV.

## Technique

- Next.js 15 (App Router, TypeScript, Tailwind 4), application web installable sur mobile (PWA).
- Supabase : PostgreSQL, authentification, stockage des photos. Cloisonnement des données par utilisateur au niveau de la base (Row Level Security).
- Schéma : `supabase/migrations/`.

## Lancer en local

```bash
cp .env.example .env.local   # renseigner l'URL et la clé publique Supabase
npm install
npm run dev
```

## Pas encore fait (prochaines étapes)

- Étiquettes imprimables avec QR code
- Génération d'annonces par IA (module 2)
- Abonnements Stripe, espace administrateur
- Tableau de bord au-delà de ~1 000 articles (agrégats à déplacer côté base)
