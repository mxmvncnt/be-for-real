# Backend
c'est ici le derriere

# SQLC
## c'est quoi 
sqlc c'est un logiciel qui permet de prendre des query sql et de les transformer en fonctions Go.
cest de la génération de code pour éviter d'avoir a établir la connexion a la DB manuellement en gros...

## comment ca marche cette patente la??
en gros jutilise un logiciel qui sappelle SQLC que tu peux installer ici: https://docs.sqlc.dev/en/stable/overview/install.html 
SQLC ça permet de definir un schema de DB dans le fichier [schema.sql](database/schema.sql). 
pour les query a la DB jutilise le meme logiciel. faut les écrire dans le fichier  [queries.sql](database/queries.sql).
c'est un peu de la magie mais que tu peux toute inspecter par la suite donc c'est pas tant magique la 

mais la tu dis "wo menute la maxime la, c'est impossible la, ce que tu dis avec ta bouche! Ben arrete de nous bullshitter maxime, la!" 
Ben je comprends parfaitement ton skepticism. Ben check ben la demonstration qu'on va te montrer, OK?
c'est super simple, quand tu as rempli les fichiers .sql en haut, tu peux juste faire la commande `sqlc genereate`. 
ça va mettre a jour tous les fichiers dans le dossier database et creer des fonctions pour que tu puisse call ta DB depuis le code!! 

C'est beautiful ça, hein?

# go
> Go my beloved c'est le meilleur language au monde entier
- maxime, 2026

si tu connais bien npm, tu devrais te débrouiller ici

tu peux installer pas mal tout le stock pour lancer le projet comme ca:
```bash
go mod tidy
```

tu peux installer des nouvelles dépendances avec 
```bash
go install <package>
```

tu peux meme rouler le projet comme ca!
```bash
go run .
```
mais avant ca il faut que tu fasse ton setup d'environnement bien sur

# environnement
pour rouler le projet il faut que tu setup ton env.
ya plein de façons de le faire, moi j'ai un fichier .env et ensuite dans mon IDE dans ma config j'ai fait qu'il le charge a chaque fois.
c'est possible sur IntelliJ avec l'extension EnvFile, et sur vscode je pense que c'est supporté de base. si tu recherches `vscode set .env file for run action`
tu devrais avoir des resultat qui ont de l'allure..
tu peux aussi juste mettre les variables dans ton environnement global. cest comme tu veux

ce que tu peux pas choisir pazempe c'est les variables a set. il te faut toutes celles definies dans [example.env](config/example.env)