// Basic interaction (optional enhancements)
document.querySelectorAll('.badge').forEach(badge => {
    badge.addEventListener('click', () => {
        alert(`You clicked on ${badge.classList[1].toUpperCase()}`);
    });
});
const ctx = document.getElementById('complianceChart').getContext('2d');

new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['HR', 'Legal', 'Finance', 'Operations'],
        datasets: [
            {
                label: 'Compliant',
                data: [5, 4, 3, 5],
                backgroundColor: '#4CAF50'
            },
            {
                label: 'Non-Compliant',
                data: [2, 3, 2, 2],
                backgroundColor: '#F44336'
            },
            {
                label: 'Review Soon',
                data: [1, 2, 1, 1],
                backgroundColor: '#FFC107'
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top'
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            x: {
                stacked: true
            },
            y: {
                stacked: true,
                beginAtZero: true
            }
        }
    }
});

// Chart.js code (if you already added it) goes here above this

document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', function (e) {
        if (e.target.tagName !== 'INPUT') {
            this.classList.toggle('expanded');
        }
    });

    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', function () {
        item.classList.toggle('completed', this.checked);
    });
});


