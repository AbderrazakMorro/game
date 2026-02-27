# Mafia Online (Loup-Garou temps réel)

Un jeu de déduction sociale multijoueur en temps réel propulsé par Next.js 14, Supabase (PostgreSQL & Realtime) et Framer Motion.

## 🚀 Démarrage Rapide

1. **Cloner / Télécharger** ce dépôt.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Configurer **Supabase** :
   - Créez un projet sur [Supabase](https://supabase.com).
   - Allez dans SQL Editor et exécutez le contenu de `schema.sql` pour créer vos tables et activer le temps réel.
   - Récupérez votre *URL* et *Anon Key* dans Project Settings > API.
4. Créer un fichier `.env.local` à la racine :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   ```
5. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```

## 🎮 Règles implémentées
- **Distribution** : 1 Mafia, puis 1 Docteur (si >=4), puis 1 Détective (si >=5). Reste = Villageois.
- **Cycle Temps Réel** : Les WebSockets (Supabase channels) synchronisent instantanément les écrans (Lobby -> Nuit -> Jour).
- **Design** : Thème Dark Mystery avec des animations Framer Motion (carte 3D au tirage).

## 🛠️ Stack Technique
- **Frontend** : Next.js 14 (App Router), React, Tailwind CSS
- **Animations** : Framer Motion
- **Backend/DB** : Supabase (Auth, PostgreSQL, Realtime Subscriptions)
- **Hébergement Recommandé** : Vercel
