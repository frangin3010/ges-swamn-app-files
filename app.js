document.addEventListener('DOMContentLoaded', () => {
    const timeScaleSelect = document.getElementById('timeScale');
    const volumeChartCanvas = document.getElementById('volumeChart');
    const historyTableBody = document.querySelector('#historyTable tbody');

    let chart;
    let gesboxData = [];

    // Remplacez cette URL par l'URL de votre feuille Google Sheets publiée au format CSV
    const googleSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTq76nAzQ1hHt1bcPoaq9Azm4LFdOEsnd7d7lXakDdCKdoOfpA-S1DXi52bsKLIRQU2aUrPFX3A-Mq6/pub?output=csv";

    function updateChart() {
        const timeScale = timeScaleSelect.value;
        if (chart) chart.destroy();

        const validData = gesboxData
            .filter(item =>
                typeof item.timestamp === 'number' &&
                typeof item.volume === 'number' &&
                typeof item.volume_cumule === 'number'
            )
            .sort((a, b) => a.timestamp - b.timestamp);

        if (validData.length === 0) {
            console.warn("Aucune donnée valide à afficher");
            return;
        }

        const dataPoints = validData.map(item => ({
            x: item.timestamp * 1000,
            y: item.volume_cumule
        }));

        chart = new Chart(volumeChartCanvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Volume Cumulé (L)',
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
                            text: 'Volume d\'eau Cumulé (L)'
                        }
                    }
                }
            }
        });
    }

    function updateHistoryTable(volume, volume_cumule, timestamp) {
        if (typeof volume !== 'number' || typeof volume_cumule !== 'number' || typeof timestamp !== 'number') {
            console.error("Données invalides :", { volume, volume_cumule, timestamp });
            return;
        }

        const row = historyTableBody.insertRow();
        const volumeCell = row.insertCell();
        const volumeCumuleCell = row.insertCell();
        const dateCell = row.insertCell();

        const date = new Date(timestamp * 1000);
        volumeCell.textContent = volume.toFixed(2);
        volumeCumuleCell.textContent = volume_cumule.toFixed(2);
        dateCell.textContent = date.toLocaleString();
    }

    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', updateChart);
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }

    function fetchDataFromGoogleSheets() {
        fetch(googleSheetURL)
            .then(response => response.text())
            .then(csvData => {
                console.log("CSV Data brute :", csvData);

                gesboxData = [];
                historyTableBody.innerHTML = '';

                const lines = csvData.split('\n');
                console.log("Lignes :", lines);

                if (lines.length <= 1) {
                    console.warn("Aucune donnée (en-têtes uniquement) dans le CSV.");
                    return;
                }

                const headers = lines[0].split(',');
                console.log("En-têtes :", headers);

                for (let i = 1; i < lines.length; i++) {
                    const data = lines[i].split(',');
                    if (data.length === headers.length) {
                        const item = {};
                        for (let j = 0; j < headers.length; j++) {
                            item[headers[j].trim()] = data[j].trim();
                        }

                        console.log("Ligne traitée :", item);

                        const volume = parseFloat(item.volume);
                        const volume_cumule = parseFloat(item.volume_cumule);
                        const timestamp = parseInt(item.timestamp);

                        console.log(`Avant conversion - Volume: ${item.volume}, Volume Cumulé: ${item.volume_cumule}, Timestamp: ${item.timestamp}`);
                        console.log(`Après conversion - Volume: ${volume}, Volume Cumulé: ${volume_cumule}, Timestamp: ${timestamp}`);

                        if (typeof volume === 'number' && !isNaN(volume) &&
                            typeof volume_cumule === 'number' && !isNaN(volume_cumule) &&
                            typeof timestamp === 'number' && !isNaN(timestamp)) {

                            gesboxData.push({ volume, volume_cumule, timestamp });
                            updateHistoryTable(volume, volume_cumule, timestamp);
                        } else {
                            console.error("Données invalides :", item);
                        }
                    }
                }

                console.log("gesboxData final :", gesboxData);

                updateChart();
            })
            .catch(error => console.error('Erreur lors de la récupération des données:', error));
    }

    fetchDataFromGoogleSheets();
    setInterval(fetchDataFromGoogleSheets, 60000);
});
