# Atelier pratique HVE Squad — journal de preuves

Conservez ce fichier dans votre dossier northwind-workshop. Notez ce qui s'est réellement produit, pas ce qui aurait dû se passer.
Ne remplissez que les sections correspondant aux chantiers que vous avez choisis.

| Champ | Valeur |
|---|---|
| Nom | |
| Date | |
| Client Copilot et version | |
| Modèle de session (pas Auto) | |
| Aiguillage des modèles (off / ranked / economy / manual) | |
| Profondeur de travail (standard / quick) | |
| Version HVE Squad (affichée par le client et Squad Doctor) | |
| Chantiers choisis (Azure / .NET / Power Platform) | |
| Périmètre produit (cas complet / domaines choisis uniquement) | |

## 01 · Squad Coach (réimaginer Northwind)

- Idées produit, architecture ou automatisation mises en avant par Squad Coach :
- Profils et packs recommandés par Squad Coach par rapport au parcours de l'atelier :

## 02 · Produit

| Mesure | Valeur |
|---|---|
| Identifiants BR- et NFR- dans le périmètre (cas complet : 28) | |
| …dont présents dans la table de traçabilité | |
| Affirmations inventées trouvées sur 3 stories vérifiées | |
| …dont marquées ASSUMPTION | |
| Contradictions relevées spontanément par le validateur d'intake (ex. BR-04 vs CS-10, CS-27) | |
| Questions posées par l'intake | |
| Éléments du backlog sans un unique tag de chantier | |
| Éléments d'une version sans le tag de cette version | |
| Versions créées par chantier (ex. azure-r1, azure-r2) | |
| Tags Git product/* créés par la squad, un par version (oui / non, créés manuellement) | |
| Corrections demandées | |

Notes sur la proposition d'équipe, le conseil et les décisions :

## 03 · Azure DevOps (facultatif)

| Mesure | Valeur |
|---|---|
| Work items créés | |
| Tags de chantier et de version présents ? Le filtre par tag correspond-il au fichier de version ? | |
| Aperçu présenté avant création ? (oui/non) | |
| Limitations rencontrées | |

## 04 · Fédération

- La promotion a-t-elle déplacé les décisions et l'historique de l'équipe produit sans les recréer ?
- docs/product et les tags Git product/* sont-ils restés intacts ?

## 05 · Chantier Azure

| Mesure | Valeur |
|---|---|
| Pack azure-cloud proposé / activé ? Compétences officielles installées ? | |
| Blocages de la grille trouvés spontanément (sur 12) | |
| Blocages accompagnés d'une preuve fichier/ligne | |
| Fichiers Bicep compilant localement / total | |
| Scripts de diagrammes régénérés / total (diagrams 0.25.1+, icônes Azure V18) | |
| Chaque service Azure utilise-t-il son icône officielle ? (oui/non) | |
| Décisions d'architecture pour la base SQL et l'échange StockPilot ? | |
| Coût mensuel estimé face au plafond de 1 500 EUR (C-04) | |

## 06 · Chantier .NET

| Mesure | Valeur |
|---|---|
| Pack dotnet proposé / activé ? Compétences officielles installées ? | |
| dotnet build réussit ? | |
| Tests au vert / total (départ : 28) | |
| Valeurs attendues modifiées dans les tests de tarification | |
| Nombre de projets dans la solution | |
| Conditions de Risk Gate ou de conseil | |

## 07 · Chantier Power Platform

| Mesure | Valeur |
|---|---|
| Pack power-platform proposé spontanément ? (oui/non) | |
| Agents Primaires, Alternates externes ou compétences officielles utilisés ? | |
| Pièges de la grille traités spontanément (sur 10) | |
| Fichiers JSON valides sous powerplatform/ / total | |
| Coût mensuel estimé (licences + exécution) face aux 900 EUR (C-08) | |
| API Order Desk consignée en dépendance OPEN ? (oui/non) | |

## 08 · Rassembler les équipes

- Le coordinateur a-t-il repris à froid sans chemins internes ?
- Une affirmation vérifiée par équipe :
- Dépendances OPEN entre chantiers :
- Notes facultatives sur Squad Document ou Squad Governance Report :
- Trois prochaines actions :

## 09 · Agents externes et Squad Connector (facultatif)

- Point de terminaison généré (agent ou orchestrateur) et manifeste 1.1 validé ?
- Mode de liaison testé (add ou replace) et rôle cible :
- Provenance externe enregistrée dans history/Squad Connector.md ?

## 10 · Bilan

- Une décision humaine qui a amélioré le résultat :
- Un point que la squad a particulièrement bien géré seule :
- Effet observé du routing, de la profondeur et des packs sur la qualité, la durée et le coût :
- Un manque ou une erreur constatée :
- Une pratique que je vais adopter, et sur quel projet :
- Estimation approximative des requêtes premium ou jetons consommés :
