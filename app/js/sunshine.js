//
// Routines for sunshine landing page
//
(function (sunshine) {

    sunshine.charts = {};
    sunshine.data = {};

    sunshine.settings = {
        montantAvantages: 'MONTANT AVANTAGES',
        nbAvantages: 'NB AVANTAGES',
        nbConventions: 'NB CONVENTIONS',
        nbAvantagesConventions: 'NB TOTAL CONVENTIONS + AVANTAGES'
    };

    sunshine.makeDoughnut = function (id, data, hasLegend, isMoney) {

        nv.addGraph(function () {
            var chart = nv.models.pieChart()
                    .x(function (d) {
                        return d.label;
                    })
                    .y(function (d) {
                        return d.value;
                    })
                    .color(_.map(data, function (datum) {
                        return datum.color;
                    }))
                    .tooltipContent(function (key, value) {
                        return "<p><b>" + key + " - " + value + "</b></p>";
                    })
                    .labelType("percent")
                    .showLabels(true)     //Display pie labels
                    .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
                    .donutRatio(0.35)     //Configure how big you want the donut hole size to be.
                ;

            if (_.isUndefined(isMoney) || isMoney === true) {
                chart = chart.valueFormat(function (d) {
                    return sunshine.utils.formatShortMoney(d);
                })
            } else {
                chart = chart.valueFormat(function (d) {
                    return sunshine.utils.formatNumber(d);
                })
            }
            if (_.isUndefined(hasLegend) || hasLegend === true) {
                chart = chart.showLegend(true);
            } else {
                chart = chart.showLegend(false);
            }

            d3.select("#" + id + " svg")
                .datum(data)
                .transition().duration(350)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
    };

    sunshine.makeHistogram = function (id, data, key, isMoney) {
        var formatter = (_.isUndefined(isMoney) || isMoney === true) ? sunshine.utils.formatShortMoney : sunshine.utils.formatNumberConvention;

        nv.addGraph(function () {
            var chart = nv.models.multiBarHorizontalChart()
                .x(function (d) {
                    return d.label
                })
                .y(function (d) {
                    return d.value
                })
                .barColor(function (d) {
                    return d.color
                })
                .margin({top: 5, right: 5, bottom: 15, left: 190})
                .tooltips(false)
                .showLegend(false)
                .showControls(false)
                .showValues(true)
                .valueFormat(formatter);

            chart.yAxis
                .tickFormat(formatter)
                .showMaxMin(false);

            d3.select('#' + id + " svg")
                .datum([
                    {key: key, values: data}
                ])
                .transition().duration(350)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
    };

    sunshine.makeTop = function (id, data, field) {
        return $('#' + id + "-top").bootstrapTable({
            data: data.filter(function(d){ return !field || d[field] })
        });
    };

    sunshine.load = function (name) {
        return $.ajax("data/" + name, {contentType: "text/csv charset=utf-8"}).then(function (data) {
            var parsed = Papa.parse(data, {header: true});
            sunshine.data[name] = parsed;
            return parsed;
        });
    };

    sunshine.stats = function (data, dimensions, sortField) {
        data = _.chain(data);

        sortField = _.isUndefined(sortField) ? sunshine.settings.montantAvantages : sortField;

        var self = {};

        function sumRows(left, right) {
            var total = {};
            _.forEach(sunshine.settings, function (value) {
                total[value] = sunshine.utils.safeFloat(left[value]) + sunshine.utils.safeFloat(right[value]);
            });
            return total;
        }

        _.forEach(dimensions, function (dimension) {
            self[dimension] = data
                .filter(function(d){ return d[dimension] })
                .groupBy(dimension)
                .map(function (groupedData, group) {
                    var results = _.reduce(groupedData, sumRows);
                    results[dimension] = group;
                    _.forEach(sunshine.settings, function (value) {
                        results[value] = sunshine.utils.safeFloat(results[value]);
                    });
                    return results;
                })
                .sortBy(sortField)
                .reverse()
                .value();
        });

        self.TOTAL = _.reduce(self[dimensions[0]], sumRows);

        return self;
    };

    sunshine.sliceAndSumOthers = function (array, begin, end, labelid, labelmsg) {
        autre = {};
        autre[sunshine.settings.montantAvantages] = parseInt(array[end][sunshine.settings.montantAvantages]);
        autre[sunshine.settings.nbAvantages] = parseInt(array[end][sunshine.settings.nbAvantages]);
        autre[sunshine.settings.nbConventions] = parseInt(array[end][sunshine.settings.nbConventions]);
        autre[sunshine.settings.nbAvantagesConventions] = parseInt(array[end][sunshine.settings.nbAvantagesConventions]);
        for (i = end + 1; i < array.length; i++) {
            autre[sunshine.settings.montantAvantages] += parseInt(array[i][sunshine.settings.montantAvantages]);
            autre[sunshine.settings.nbAvantages] += parseInt(array[i][sunshine.settings.nbAvantages]);
            autre[sunshine.settings.nbConventions] += parseInt(array[i][sunshine.settings.nbConventions]);
            autre[sunshine.settings.nbAvantagesConventions] += parseInt(array[i][sunshine.settings.nbAvantagesConventions]);
        }
        autre[labelid] = labelmsg;
        array[end] = autre;
        return _(array).slice(begin, end + 1);
    };

    //
    //
    // Load data, draw charts, tables, etc.
    //
    //
    sunshine.drawGlobalAndLaboStats = function () {
        if (window.location.href.indexOf('reseau.html') != -1) return;
        sunshine.load("labos.csv").done(function (response) {
            var stats = sunshine.stats(response.data, ['LABO']);
            var options = {
                useGrouping: true, // 1,000,000 vs 1000000
                separator: '&nbsp;', // character to use as a separator
                decimal: ',' // character to use as a decimal
            };
            new countUp("montant-avantages", 0, stats.TOTAL[sunshine.settings.montantAvantages], 0, 3, options).start();
            new countUp("nb-avantages", 0, stats.TOTAL[sunshine.settings.nbAvantages], 0, 3, options).start();
            new countUp("nb-conventions", 0, stats.TOTAL[sunshine.settings.nbConventions], 0, 3, options).start();
            var chartData = _(stats.LABO).slice(0, 15)
                .map(function (labo) {
                    return {
                        value: labo[sunshine.settings.montantAvantages],
                        color: sunshine.scale.LABO(labo.LABO),
                        label: labo.LABO
                    };
                })
                .value();
            sunshine.makeHistogram("labos", chartData, "Laboratoire");
            sunshine.makeTop("labos", stats.LABO);
        });

        sunshine.load("metiers.departements.csv").done(function (response) {
            var stats = sunshine.stats(response.data, ['METIER']);
            var chartData = sunshine.sliceAndSumOthers(stats.METIER, 0, 10, 'METIER', 'Autres qualifications')
                .map(function (metier) {
                    return {
                        value: metier[sunshine.settings.montantAvantages],
                        color: sunshine.scale.METIER(metier.METIER),
                        label: sunshine.scale.LABEL(metier.METIER)
                    };
                })
                .value();
            sunshine.makeDoughnut("praticiens", chartData);
        });

        sunshine.load("beneficiaires.top.csv").done(function (response) {
            sunshine.makeTop("beneficiaires", response.data, "BENEFICIAIRE");
        });

        sunshine.load("conventions.departements.csv").done(function (response) {
            var stats = sunshine.stats(response.data, ['OBJET CONVENTION'], sunshine.settings.nbConventions);
            var chartData = sunshine.sliceAndSumOthers(stats['OBJET CONVENTION'], 0, 14, 'OBJET CONVENTION', 'Autres objets')
                .map(function (objet) {
                    return {
                        value: objet[sunshine.settings.nbConventions],
                        color: sunshine.scale.OBJET(objet['OBJET CONVENTION']),
                        label: sunshine.scale.LABEL(objet['OBJET CONVENTION'])
                    };
                })
                .sortBy("value")
                .reverse()
                .value();
            sunshine.makeHistogram("objet-conventions", chartData, "Conventions", false);
        });

        sunshine.load("avantages.departements.csv").done(function (response) {
            var stats = sunshine.stats(response.data, ['NATURE AVANTAGE']);
            var chartData = sunshine.sliceAndSumOthers(stats['NATURE AVANTAGE'], 0, 6, 'NATURE AVANTAGE', 'Autres types de cadeaux')
                .map(function (objet) {
                    return {
                        value: objet[sunshine.settings.montantAvantages],
                        color: sunshine.scale.NATURE(objet['NATURE AVANTAGE']),
                        label: sunshine.scale.LABEL(objet['NATURE AVANTAGE'])
                    };
                })
                .sortBy("value")
                .reverse()
                .value();
            sunshine.makeDoughnut("nature-avantages", chartData);
        });
    };

    //
    //
    // Color scales
    //
    //
    sunshine.scale = {};

    sunshine.scale.OBJET = function (name) {
        var colors = {
            "HOSPITALITÉ": "#1f77b4",
            "CONGRÈS - SYMPOSIUM": "#7f7f7f",
            "CONTRAT DE CONSULTANT": "#aec7e8",
            "FORMATION": "#2ca02c",
            "COLLABORATION SCIENTIFIQUE": "#98df8a",
            "ÉTUDE DE MARCHÉ": "#ff7f0e",
            "ORATEUR/FORMATEUR": "#ffee8a",
            "PROMOTION/PUBLICITÉ": "#d62728",
            "EXPERT": "#ff9896",
            "RÉUNION": "#e377c2",
            "Autres objets": "#17becf",
            "MARKETING": "#c5b0d5",
            "DIVERS": "#c49c94",
            "PRESTATION DE SERVICES": "#f7b6d2",
            "STAND": "#7b4173"
        };

        if (_.isUndefined(colors[name])) {
            return "#d9d9d9";
        } else {
            return colors[name];
        }
    };

    sunshine.scale.NATURE = function (name) {
        var colors = {
            "HOSPITALITÉ": "#1f77b4",
            "TRANSPORT": "#aec7e8",
            "HÉBERGEMENT": "#2ca02c",
            "CONGRES": "#98df8a",
            "DON": "#ffee8a",
            "Autres types de cadeaux": "#ff7f0e",
            "REPAS": "#d62728"
        };

        if (_.isUndefined(colors[name])) {
            return "#d9d9d9";
        } else {
            return colors[name];
        }
    };

    sunshine.scale.METIER = function (name) {
        var colors = {
            "Médecin": "#1f77b4",
            "Asso de prof. de santé": "#aec7e8",
            "Pharmacien": "#ff7f0e",
            "Infirmier": "#ffbb78",
            "Fondation": "#2ca02c",
            "Asso d'usager de santé": "#98df8a",
            "Chirurgien-dentiste": "#d62728",
            "Dentiste": "#d62728",
            "Interne": "#ff9896",
            "Etudiant": "#9467bd",
            "Préparateur en pharmacie": "#c5b0d5",
            "Autres types de personne morale": "#8c564b",
            "Manipulateur électroradio": "#c49c94",
            "Etablissement de santé": "#e377c2",
            "Opticien-lunetier": "#f7b6d2",
            "Audioprothésiste": "#7f7f7f",
            "Sage-femme": "#c7c7c7",
            "Prothésiste et orthésiste pour l’appareillage des personnes handicapées": "#bcbd22",
            "Masseur-kinésithérapeute": "#dbdb8d",
            "Diététicien": "#17becf",
            "Technicien de laboratoire médical": "#9edae5",
            "Autres qualifications": "#d9d9d9"
        };
        if (_.isUndefined(colors[name])) {
            return "#d9d9d9";
        } else {
            return colors[name];
        }
    };

    sunshine.scale.LABEL = function (name) {
        var labels = {
            "Asso de prof. de santé": "Assos de prof. de santé",
            "Asso d'usager de santé": "Assos d'usager de santé",
            "Etudiant": "Étudiants",
            "Autres qualifications": "Autres qualifications",
            "Autres types de cadeaux": "Autres types de cadeaux",
            "Congres": "Congrès",
            "Étude de marché": "Études de marché",
            "Prestation de services": "Prestations de services",
            "Marketing": "Études marketing",
            "Promotion/Publicité": "Promotions/Publicités",
            "Collaboration scientifique": "Collaborations scientifiques",
            "Contrat de consultant": "Contrats de consultant",
            "Contrat de cession": "Contrats de cession",
            "Autres objets": "Autres objets",
            "Divers": "Divers",
            "Repas": "Repas"
        };
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        if (_.isUndefined(labels[name])) {
            return name + "s";
        } else {
            return labels[name];
        }
    };

    sunshine.scale.LABO = function (name) {
        var colors = {
            "NOVARTIS PHARMA": "#1f77b4",
            SERVIER: "#aec7e8",
            GLAXOSMITHKLINE: "#ff7f0e",
            MSD: "#ffbb78",
            "JANSSEN CILAG": "#2ca02c",
            ASTRAZENECA: "#98df8a",
            SANOFI: "#d62728",
            PFIZER: "#ff9896",
            "ASTELLAS PHARMA": "#9467bd",
            "BOEHRINGER INGELHEIM": "#c5b0d5",
            "DAIICHI SANKYO": "#8c564b",
            LUNDBECK: "#c49c94",
            ROCHE: "#e377c2",
            GUERBET: "#f7b6d2",
            BAYER: "#7f7f7f",
            MEDTRONIC: "#c7c7c7",
            "PIERRE FABRE": "#ffee8a",
            "BIOGEN IDEC": "#dbdb8d",
            "ST JUDE MEDICAL": "#17becf",
            "ALK-Abello": "#9edae5"
        };

        if (_.isUndefined(colors[name])) {
            return "#d9d9d9";
        } else {
            return colors[name];
        }
    };

    //
    //
    // Utils routines
    //
    //
    sunshine.utils = {};
    sunshine.utils.safeFloat = function (string) {
        if (_.isUndefined(string) || _.isEmpty(string + "")) {
            return 0;
        } else {
            return parseFloat(string);
        }
    };

    sunshine.utils.formatNumber = function (number) {
        return (+(+number).toFixed(0)).toLocaleString();
    };

    sunshine.utils.formatNumberConvention = function (number) {
        return (+(+number).toFixed(0)).toLocaleString();
    };

    sunshine.utils.formatMoney = function (number) {
        return sunshine.utils.formatNumber(number) + " €";
    };

    sunshine.utils.formatShortMoney = function (number) {
        return (+(+number / 1000000).toFixed(2)).toLocaleString() + " M€";
    };

    //
    //
    // Start sunshine !
    //
    //
    sunshine.start = function () {
        sunshine.drawGlobalAndLaboStats();
        $('body').scrollspy({target: '.topnav', offset: 50});
        $('.nav-link').click(function (e) {
            e.preventDefault();

            var goto = $(this).attr('href');
            var top;

            if (_.isUndefined($(goto).offset())) {
                top = 0;
            } else {
                top = $(goto).offset().top;
            }

            $('html, body').animate({
                scrollTop: top - 30
            }, 500);
        });
    };

    $(document).ready(sunshine.start);

})(window.sunshine = window.sunshine || {});
