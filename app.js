document.addEventListener('DOMContentLoaded', () => {
    const timeScaleSelect = document.getElementById('timeScale'); // Sélecteur d'échelle de temps
    const volumeChartCanvas = document.getElementById('volumeChart'); // Canvas du graphique
    const historyTableBody = document.querySelector('#historyTable tbody'); // Corps du tableau d'historique
    let chart;

    function updateChart(data) {
        const timeScale = timeScaleSelect.value;
        if (chart) chart.destroy();
        const validData = data
            .filter(item => typeof item.timestamp === 'number' && typeof item.volume === 'number')
            .sort((a, b) => a.timestamp - b.timestamp);
        if (validData.length === 0) {
            console.warn("Aucune donnée valide à afficher");
            return;
        }
        const dataPoints = validData.map(item => ({
            x: item.timestamp * 1000,
            y: item.volume
        }));
        chart = new Chart(volumeChartCanvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Volume (L)',
                    data: dataPoints,
                    borderColor: 'blue',
                    fill: false,
                    pointRadius: 0,
                    hitRadius: 0
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: timeScale,
                            displayFormats: {
                                hour: 'HH:mm',
                                day: 'dd/MM/yyyy',
                                week: 'dd/MM/yyyy',
                                month: 'MMM yyyy',
                                year: 'yyyy'
                            },
                            tooltipFormat: 'dd/MM/yyyy HH:mm'
                        },
                        adapters: {
                            date: {
                                locale: window.frLocale
                            }
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            source: 'data'
                        },
                        title: {
                            display: true,
                            text: 'Date/Heure'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Volume d\'eau (L)'
                        }
                    }
                }
            }
        });
    }

    function updateHistoryTable(data) {
        historyTableBody.innerHTML = ''; // Efface l'historique précédent
        let cumulativeVolume = 0;

        data.forEach(item => {
            if (typeof item.volume !== 'number' || typeof item.timestamp !== 'number') {
                console.error("Données invalides :", item);
                return;
            }
            const row = historyTableBody.insertRow();
            const volumeCell = row.insertCell();
            const cumulativeVolumeCell = row.insertCell();
            const dateCell = row.insertCell();

            cumulativeVolume += item.volume;
            const date = new Date(item.timestamp * 1000);

            volumeCell.textContent = item.volume.toFixed(2);
            cumulativeVolumeCell.textContent = cumulativeVolume.toFixed(2);
            dateCell.textContent = date.toLocaleString();
        });
    }

    async function fetchDataFromGoogleSheets() {
        const sheetId = "1-hUrnHF0h_8kR4lPk4OxkoJ894tNKZ3rI3z-aydpp2s"; // ID de votre feuille
        const apiKey = "AIzaSyCUZvlXiW-EvSzAc1DQ-RJk7sPw640LYAQ"; // Votre API Key
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:D100?key=${apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const rows = data.values.slice(1); // Ignorer la première ligne (en-têtes)

            const formattedData = rows.map(row => ({
                gesBoxId: row[0],
                volume: parseFloat(row[1]),
                timestamp: new Date(row[2]).getTime() / 1000,
                cumulativeVolume: parseFloat(row[3])
            })).filter(item => !isNaN(item.volume) && !isNaN(item.timestamp));

            updateChart(formattedData);
            updateHistoryTable(formattedData);
        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    }

    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', fetchDataFromGoogleSheets);
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }

    fetchDataFromGoogleSheets(); // Charge les données depuis Google Sheets
});
