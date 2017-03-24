"""
TODO:
 - rectifs
 - verifs departement avec benef + benef_etablissement
"""

import csv, sys
from pprint import pprint as pp
from collections import Counter

from tqdm import tqdm

if len(sys.argv) < 4:
    print('usage: python parse.py avantages.csv conventions.csv dest_dir/ [limit]')

LIMIT = None
if len(sys.argv) > 4:
    LIMIT = int(sys.argv[4])
    print('-- RUN LIMITED TO ', LIMIT, ' rows --')

# hardcoded to give an hint for the progress bar
NB_AVANT = 6190307
NB_CONV = 2505210

# labos.csv
labos = {}

# avantages.departements.csv
avants = {}

# beneficiaires.top.csv
benefs = {}

# metiers.departements.csv
metiers = {}

# conventions.departements.csv
convs = {}

##############
## AVANTAGES

count = 0
filename = sys.argv[1]
with open(filename) as csvfile:
    delimiter = ';'
    if 'decl_' in filename:
        delimiter = ','
    reader = csv.DictReader(csvfile, delimiter=delimiter)
    for row in tqdm(reader, total=NB_AVANT):
        labo = row['denomination_sociale'].upper()
        if labo not in labos:
            labos[labo] = {
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        labos[labo]['nb_avant'] += 1
        labos[labo]['montant_avant'] += int(row['avant_montant_ttc'])

        nature = (row['avant_nature']
            .replace('[','')
            .replace(']', '')
            .upper())
        nature = nature.replace('Repas Professionnel'.upper(), 'Repas'.upper())
        if nature.startswith('HOSPITALITE'):
            nature = 'HOSPITALITE'
        if nature.startswith('DONS'):
            nature = 'DONS'
        
        dep = row['benef_codepostal'][:2]
        naturedep = nature + ',' + dep
        if naturedep not in avants:
            avants[naturedep] = {
                'nature': nature,
                'dep': dep,
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        avants[naturedep]['nb_avant'] += 1
        avants[naturedep]['montant_avant'] += int(row['avant_montant_ttc'])

        benef_short = ' '.join([row['benef_nom'], row['benef_prenom'], row['benef_codepostal'], row['benef_ville']])
        if not row['benef_nom']:
            benef_short = ' '.join([row['benef_denomination_sociale'], row['benef_objet_social'], row['benef_codepostal'], row['benef_ville']])
        benef = row['benef_nom'] + ' ' + row['benef_prenom'] + ' [' + row['benef_adresse1'] \
            + ' ' + row['benef_adresse2'] + ' ' + row['benef_adresse3'] + ' ' +row['benef_adresse4'] \
            + ' ' + row['benef_codepostal'] + ' ' + row['benef_ville']
        qualif = row['qualite'] # benef_speicalite_libelle ?
        key = hash(benef_short)
        if key not in benefs:
            benefs[key] = {
                'benef': benef_short,
                'qualif': qualif,
                'dep': dep,
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        benefs[key]['nb_avant'] += 1
        benefs[key]['montant_avant'] += int(row['avant_montant_ttc'])

        key = qualif + ',' + dep
        if key not in metiers:
            metiers[key] = {
                'metier': qualif,
                'dep': dep,
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        metiers[key]['nb_avant'] += 1
        metiers[key]['montant_avant'] += int(row['avant_montant_ttc'])

        count += 1

        if LIMIT and count >= LIMIT:
            break

print(count, 'avant')

##############
## CONVENTIONS

count = 0
filename = sys.argv[2]
with open(filename) as csvfile:
    delimiter = ';'
    if 'decl_' in filename:
        delimiter = ','
    reader = csv.DictReader(csvfile, delimiter=delimiter)
    for row in tqdm(reader, total=NB_CONV):
        labo = row['denomination_sociale'].upper()
        if labo not in labos:
            labos[labo] = {
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        labos[labo]['nb_conv'] += 1

        benef_short = ' '.join([row['benef_nom'], row['benef_prenom'], row['benef_codepostal'], row['benef_ville']])
        if not row['benef_nom']:
            benef_short = ' '.join([row['benef_denomination_sociale'], row['benef_objet_social'], row['benef_codepostal'], row['benef_ville']])
        benef = row['benef_nom'] + ' ' + row['benef_prenom'] + ' [' + row['benef_adresse1'] \
            + ' ' + row['benef_adresse2'] + ' ' + row['benef_adresse3'] + ' ' +row['benef_adresse4'] \
            + ' ' + row['benef_codepostal'] + ' ' + row['benef_ville']
        qualif = row['qualite'] # benef_speicalite_libelle ?
        key = hash(benef_short)
        if key not in benefs:
            benefs[key] = {
                'benef': benef_short,
                'qualif': qualif,
                'dep': dep,
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        benefs[key]['nb_conv'] += 1

        objet = row['conv_objet'].strip().upper().replace('[', '').replace(']', '')

        dep = row['benef_etablissement_codepostal']
        key = objet + ',' + dep
        if key not in convs:
            convs[key] = {
                'objet': objet,
                'dep': dep,
                'nb_avant': 0,
                'montant_avant': 0,
                'nb_conv': 0,
            }
        convs[key]['nb_conv'] += 1

        count += 1

        if LIMIT and count >= LIMIT:
            break

print(count, 'conv')

dest_dir = sys.argv[3]

# labos.csv
with open(dest_dir + 'labos.csv', 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow('LABO,NB TOTAL CONVENTIONS + AVANTAGES,NB CONVENTIONS,NB AVANTAGES,MONTANT AVANTAGES'.split(','))
    for labo, stats in labos.items():
        writer.writerow([labo, stats['nb_avant'] + stats['nb_conv'],
            stats['nb_conv'], stats['nb_avant'], stats['montant_avant']])
print('labos.csv done')

# avantages.departements.csv
with open(dest_dir + 'avantages.departements.csv', 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow('NATURE AVANTAGE,DEPARTEMENT,NB TOTAL CONVENTIONS + AVANTAGES,NB CONVENTIONS,NB AVANTAGES,MONTANT AVANTAGES'.split(','))
    for stats in avants.values():
        writer.writerow([stats['nature'], stats['dep'], stats['nb_avant'] + stats['nb_conv'],
            stats['nb_conv'], stats['nb_avant'], stats['montant_avant']])
print('avantages.departements.csv done')

# beneficiaires.top.csv
with open(dest_dir + 'beneficiaires.top.csv', 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow('BENEFICIAIRE,QUALIFICATION,DEPARTEMENT,NB TOTAL CONVENTIONS + AVANTAGES,NB CONVENTIONS,NB AVANTAGES,MONTANT AVANTAGES'.split(','))
    rows = []
    for stats in benefs.values():
        row = [stats['benef'], stats['qualif'], stats['dep'], stats['nb_avant'] + stats['nb_conv'],
            stats['nb_conv'], stats['nb_avant'], stats['montant_avant']]
        rows.append(row)
    rows.sort(key=lambda row: -row[-1])
    for row in rows[:5000]:
        writer.writerow(row)
print('beneficiaires.top.csv done')

# metiers.departements.csv
with open(dest_dir + 'metiers.departements.csv', 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow('METIER,DEPARTEMENT,NB TOTAL CONVENTIONS + AVANTAGES,NB CONVENTIONS,NB AVANTAGES,MONTANT AVANTAGES'.split(','))
    rows = []
    for stats in metiers.values():
        row = [stats['metier'], stats['dep'], stats['nb_avant'] + stats['nb_conv'],
            stats['nb_conv'], stats['nb_avant'], stats['montant_avant']]
        writer.writerow(row)
print('metiers.departements.csv done')

# conventions.departements.csv
with open(dest_dir + 'conventions.departements.csv', 'w') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow('OBJET CONVENTION,DEPARTEMENT,NB TOTAL CONVENTIONS + AVANTAGES,NB CONVENTIONS,NB AVANTAGES,MONTANT AVANTAGES'.split(','))
    rows = []
    for stats in convs.values():
        row = [stats['objet'], stats['dep'], stats['nb_avant'] + stats['nb_conv'],
            stats['nb_conv'], stats['nb_avant'], stats['montant_avant']]
        writer.writerow(row)
print('conventions.departements.csv done')
