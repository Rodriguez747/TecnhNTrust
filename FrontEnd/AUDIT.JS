const ctx = document.getElementById('auditStatusChart').getContext('2d');
  const auditStatusChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Completed', 'In Progress', 'Pending'],
      datasets: [{
        label: 'Audit Status Summary',
        data: [40, 35, 25], // Example values (percentages or counts)
        backgroundColor: [
          '#4CAF50',   // Green for Completed
          '#FFEB3B',   // Yellow for In Progress
          '#F44336'    // Red for Pending
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed + '%';
            }
          }
        }
      }
    }
  });

  