document.addEventListener('DOMContentLoaded', () => {
    const timeScaleSelect = document.getElementById('timeScale');
    const volumeChartCanvas = document.getElementById('volumeChart');
    const historyTableBody = document.querySelector('#historyTable tbody');
    let chart;

    // Convertir les virgules en points pour les nombres décimaux
    function parseFrenchDecimal(str) {
        return parseFloat(str.replace(',', '.'));
    }

    // Convertir les dates françaises (jj/mm/aaaa) en timestamps
    function parseFrenchDate(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${month}/${day}/${year}`).getTime() / 1000;
    }

    function updateChart(data) {
        const timeScale = timeScaleSelect.value;
        if (chart) chart.destroy();
        
        const validData = data
            .filter(item => 
                typeof item.timestamp === 'number' && 
                typeof item.volume === 'number'
            )
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
            data: { datasets: [{ 
                label: 'Volume (L)', 
                data: dataPoints,
                borderColor: 'blue',
                fill: false,
                pointRadius: 0,
                hitRadius: 0 
            }] },
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
                        adapters: { date: { locale: window.frLocale } },
                        ticks: { autoSkip: false, maxRotation: 45, source: 'data' },
                        title: { display: true, text: 'Date/Heure' }
                    },
                    y: { title: { display: true, text: 'Volume d\'eau (L)' } }
                }
            }
        });
    }

    function updateHistoryTable(data) {
        historyTableBody.innerHTML = '';
        let cumulativeVolume = 0;
        
        data.forEach(item => {
            if (typeof item.volume !== 'number' || typeof item.timestamp !== 'number') {
                console.error("Données invalides :", item);
                return;
            }
            
            const row = historyTableBody.insertRow();
            const volumeCell = row.insertCell();
            const cumulativeCell = row.insertCell();
            const dateCell = row.insertCell();
            
            cumulativeVolume += item.volume;
            const date = new Date(item.timestamp * 1000);
            
            volumeCell.textContent = item.volume.toFixed(2);
            cumulativeCell.textContent = cumulativeVolume.toFixed(2);
            dateCell.textContent = date.toLocaleString('fr-FR');
        });
    }

    async function fetchDataFromGoogleSheets() {
        const sheetId = "1-hUrnHF0h_8kR4lPk4OxkoJ894tNKZ3rI3z-aydpp2s";
        const apiKey = "AIzaSyCUZvlXiW-EvSzAc1DQ-RJk7sPw640LYAQ";
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:D100?key=${apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const rows = data.values.slice(1); // Ignorer les en-têtes

            const formattedData = rows.map(row => {
                // Gestion des dates françaises et des décimales
                return {
                    gesBoxId: row[0],
                    volume: parseFrenchDecimal(row[1]),
                    timestamp: parseFrenchDate(row[2]),
                    cumulativeVolume: parseFrenchDecimal(row[3])
                };
            }).filter(item => 
                !isNaN(item.volume) && 
                !isNaN(item.timestamp)
            );

            gesboxData = formattedData;
            updateChart();
            updateHistoryTable(formattedData);
        } catch (error) {
            console.error("Erreur lors de la récupération :", error);
        }
    }

    // Gestion du sélecteur
    if (timeScaleSelect) {
        timeScaleSelect.addEventListener('change', fetchDataFromGoogleSheets);
    } else {
        console.error("Élément timeScaleSelect non trouvé !");
    }

    fetchDataFromGoogleSheets(); // Chargement initial
});
