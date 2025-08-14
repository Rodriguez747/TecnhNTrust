(function () {
	const tableBody = document.getElementById('risksTableBody');
	const modalRoot = document.getElementById('modalRoot');
	const newBtn = document.querySelector('.new-btn');

	// Seed data if none
	const DEFAULT_RISKS = [
		{
			id: cryptoRandomId(),
			risk_title: 'Budget Overrun',
			dept: 'Finance',
			review_date: new Date().toISOString().slice(0, 10),
			progress: 68,
			status: 'on track',
			tasks: defaultTasks('Budget Overrun')
		},
		{
			id: cryptoRandomId(),
			risk_title: 'Data Breach',
			dept: 'IT',
			review_date: new Date().toISOString().slice(0, 10),
			progress: 25,
			status: 'At risk',
			tasks: defaultTasks('Data Breach')
		}
	];

	function cryptoRandomId() {
		return 'r_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
	}

	function getStore() {
		try {
			const raw = localStorage.getItem('ct_risks');
			if (!raw) return DEFAULT_RISKS;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_RISKS;
			return parsed;
		} catch (e) {
			return DEFAULT_RISKS;
		}
	}
	function saveStore(risks) {
		localStorage.setItem('ct_risks', JSON.stringify(risks));
	}

	function defaultTasks(riskName) {
		// Provide a sensible set of weighted tasks; weight is the percentage contributed when checked
		// We use weights that sum to 100.
		if (/breach/i.test(riskName)) {
			return [
				{ id: cryptoRandomId(), label: 'Enable MFA for all privileged accounts', weight: 20, done: false },
				{ id: cryptoRandomId(), label: 'Patch critical systems', weight: 20, done: false },
				{ id: cryptoRandomId(), label: 'Encrypt sensitive data at rest', weight: 15, done: false },
				{ id: cryptoRandomId(), label: 'Implement IDS/IPS monitoring', weight: 15, done: false },
				{ id: cryptoRandomId(), label: 'Employee security awareness training', weight: 10, done: false },
				{ id: cryptoRandomId(), label: 'Backup and disaster recovery test', weight: 20, done: false }
			];
		}
		if (/budget|overrun/i.test(riskName)) {
			return [
				{ id: cryptoRandomId(), label: 'Baseline current spend', weight: 15, done: false },
				{ id: cryptoRandomId(), label: 'Negotiate vendor discounts', weight: 20, done: false },
				{ id: cryptoRandomId(), label: 'Freeze nonessential purchases', weight: 15, done: false },
				{ id: cryptoRandomId(), label: 'Weekly cost variance review', weight: 15, done: false },
				{ id: cryptoRandomId(), label: 'Automate spend alerts', weight: 15, done: false },
				{ id: cryptoRandomId(), label: 'Reforecast budget with stakeholders', weight: 20, done: false }
			];
		}
		return [
			{ id: cryptoRandomId(), label: 'Define mitigation plan', weight: 20, done: false },
			{ id: cryptoRandomId(), label: 'Assign owner(s)', weight: 10, done: false },
			{ id: cryptoRandomId(), label: 'Identify key milestones', weight: 15, done: false },
			{ id: cryptoRandomId(), label: 'Execute main mitigation tasks', weight: 35, done: false },
			{ id: cryptoRandomId(), label: 'Validate outcomes', weight: 10, done: false },
			{ id: cryptoRandomId(), label: 'Close-out and document', weight: 10, done: false }
		];
	}

	function computeProgress(tasks) {
		return Math.round(tasks.reduce((acc, t) => acc + (t.done ? t.weight : 0), 0));
	}

	function computeStatus(progress) {
		if (progress >= 80) return 'Ahead';
		if (progress <= 30) return 'At risk';
		return 'on track';
	}

	function render() {
		const risks = getStore();
		tableBody.innerHTML = '';
		risks.forEach(risk => {
			const tr = document.createElement('tr');

			const nameTd = document.createElement('td');
			nameTd.className = 'risk-name';
			nameTd.textContent = risk.risk_title;

			const deptTd = document.createElement('td');
			const icon = document.createElement('span');
			icon.className = 'user-icon green';
			icon.title = 'Assigned User';
			deptTd.appendChild(icon);
			deptTd.appendChild(document.createTextNode(' ' + (risk.dept || 'Unassigned')));

			const dateTd = document.createElement('td');
			dateTd.className = 'due-date';
			const date = new Date(risk.review_date);
			dateTd.textContent = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });

			const progressTd = document.createElement('td');
			progressTd.innerHTML = `
				<div class="progress-bar">
					<div class="progress-bar-inner">
						<div class="progress-fill ${progressFillClass(risk)}" style="width:${risk.progress}%"></div>
					</div>
					<div class="percent">${risk.progress}%</div>
				</div>
			`;

			const statusTd = document.createElement('td');
			statusTd.innerHTML = `<span class="status-badge ${statusBadgeClass(risk.status)}">${risk.status}</span>`;

			const actionTd = document.createElement('td');
			const editBtn = document.createElement('button');
			editBtn.className = 'btn-edit';
			editBtn.textContent = 'Edit';
			editBtn.addEventListener('click', () => openEditModal(risk.id));
			actionTd.appendChild(editBtn);

			tr.appendChild(nameTd);
			tr.appendChild(deptTd);
			tr.appendChild(dateTd);
			tr.appendChild(progressTd);
			tr.appendChild(statusTd);
			tr.appendChild(actionTd);
			tableBody.appendChild(tr);
		});
	}

	function statusBadgeClass(status) {
		const s = String(status || '').toLowerCase();
		if (s === 'at risk') return 'status-atrisk';
		if (s === 'ahead') return 'status-ahead';
		return 'status-ontrack';
	}
	function progressFillClass(risk) {
		const s = String(risk.status || '').toLowerCase();
		if (s === 'at risk') return 'fill-red';
		if (s === 'ahead') return 'fill-purple';
		return 'fill-green';
	}

	function openNewModal() {
		openModal('New Risk', buildRiskForm(), ({ close, getValues }) => {
			return [
				{ text: 'Cancel', variant: 'secondary', onClick: () => close() },
				{ text: 'Save', variant: 'primary', onClick: () => {
					const values = getValues();
					const risks = getStore();
					const newRisk = {
						id: cryptoRandomId(),
						risk_title: values.title,
						dept: values.dept,
						review_date: values.dueDate,
						tasks: values.tasks,
						progress: computeProgress(values.tasks),
						status: computeStatus(computeProgress(values.tasks))
					};
					risks.unshift(newRisk);
					saveStore(risks);
					render();
					close();
				} }
			];
		});
	}

	function openEditModal(riskId) {
		const risks = getStore();
		const risk = risks.find(r => r.id === riskId);
		if (!risk) return;
		openModal('Edit Risk Progress', buildTaskChecklist(risk), ({ close, getTaskValues }) => {
			return [
				{ text: 'Close', variant: 'secondary', onClick: () => close() },
				{ text: 'Save Changes', variant: 'primary', onClick: () => {
					const updatedTasks = getTaskValues();
					const progress = computeProgress(updatedTasks);
					risk.tasks = updatedTasks;
					risk.progress = progress;
					risk.status = computeStatus(progress);
					saveStore(risks);
					render();
					close();
				} }
			];
		});
	}

	function openModal(title, bodyEl, actionsBuilder) {
		const overlay = document.createElement('div');
		overlay.className = 'modal-overlay';
		const modal = document.createElement('div');
		modal.className = 'modal';

		const header = document.createElement('div');
		header.className = 'modal-header';
		const h3 = document.createElement('h3');
		h3.textContent = title;
		const closeBtn = document.createElement('button');
		closeBtn.className = 'modal-close';
		closeBtn.innerHTML = '&times;';
		closeBtn.addEventListener('click', close);
		header.appendChild(h3);
		header.appendChild(closeBtn);

		const body = document.createElement('div');
		body.className = 'modal-body';
		if (bodyEl) body.appendChild(bodyEl);

		const actions = document.createElement('div');
		actions.className = 'modal-actions';
		const makeActions = actionsBuilder({ close, getValues, getTaskValues });
		makeActions.forEach(a => {
			const b = document.createElement('button');
			b.className = `btn ${a.variant ? 'btn-' + a.variant : ''}`;
			b.textContent = a.text;
			b.addEventListener('click', a.onClick);
			actions.appendChild(b);
		});

		modal.appendChild(header);
		modal.appendChild(body);
		modal.appendChild(actions);
		overlay.appendChild(modal);
		modalRoot.appendChild(overlay);
		overlay.style.display = 'flex';

		function close() {
			modalRoot.removeChild(overlay);
		}
		function getValues() { /* for create form */ return currentFormValues; }
		function getTaskValues() { return currentTaskValues(); }

		let currentFormValues = null;
		let currentTaskValues = () => [];

		// Expose setters from builders
		if (bodyEl && bodyEl.__bindValues__) {
			const { setValuesGetter } = bodyEl.__bindValues__;
			setValuesGetter(v => { currentFormValues = v; });
		}
		if (bodyEl && bodyEl.__bindTaskGetter__) {
			const { setTaskGetter } = bodyEl.__bindTaskGetter__;
			setTaskGetter(fn => { currentTaskValues = fn; });
		}
	}

	function buildRiskForm() {
		const container = document.createElement('div');

		const titleRow = formRow('Risk Title', 'text', '');
		const deptRow = formRow('Assign To (Dept/Owner)', 'text', '');
		const dateRow = formRow('Due Date', 'date', new Date().toISOString().slice(0, 10));

		const tasksHeader = document.createElement('div');
		tasksHeader.style.fontWeight = '700';
		tasksHeader.style.margin = '10px 0 6px';
		tasksHeader.textContent = 'Tasks Checklist (weights sum to 100%)';

		const tasksList = document.createElement('div');
		tasksList.className = 'tasks-list';

		const seedTasks = defaultTasks('generic');
		seedTasks.forEach(t => tasksList.appendChild(taskItemRow(t)));

		const addTaskBtn = document.createElement('button');
		addTaskBtn.className = 'btn btn-secondary';
		addTaskBtn.textContent = 'Add Task';
		addTaskBtn.addEventListener('click', () => {
			const t = { id: cryptoRandomId(), label: 'New task', weight: 10, done: false };
			tasksList.appendChild(taskItemRow(t));
		});

		container.appendChild(titleRow.row);
		container.appendChild(deptRow.row);
		container.appendChild(dateRow.row);
		container.appendChild(tasksHeader);
		container.appendChild(tasksList);
		container.appendChild(addTaskBtn);

		container.__bindValues__ = {
			setValuesGetter: (fn) => {
				fn(() => ({
					title: titleRow.input.value.trim() || 'Untitled Risk',
					dept: deptRow.input.value.trim() || 'Unassigned',
					dueDate: dateRow.input.value,
					tasks: collectTasks(tasksList)
				}));
			}
		};

		return container;
	}

	function buildTaskChecklist(risk) {
		const container = document.createElement('div');
		const title = document.createElement('div');
		title.style.fontWeight = '700';
		title.style.marginBottom = '6px';
		title.textContent = risk.risk_title;
		container.appendChild(title);

		const tasksList = document.createElement('div');
		tasksList.className = 'tasks-list';
		risk.tasks.forEach(t => {
			const el = taskCheckboxRow(t);
			tasksList.appendChild(el);
		});
		container.appendChild(tasksList);

		const progressPreview = document.createElement('div');
		progressPreview.style.marginTop = '8px';
		progressPreview.style.fontWeight = '700';
		progressPreview.textContent = `Progress: ${computeProgress(risk.tasks)}%`;
		container.appendChild(progressPreview);

		container.__bindTaskGetter__ = {
			setTaskGetter: (fn) => {
				fn(() => collectTasksFromChecklist(tasksList, progressPreview));
			}
		};

		return container;
	}

	function formRow(labelText, type, value) {
		const row = document.createElement('div');
		row.className = 'form-row';
		const label = document.createElement('label');
		label.textContent = labelText;
		const input = document.createElement('input');
		input.type = type;
		input.value = value;
		row.appendChild(label);
		row.appendChild(input);
		return { row, input };
	}

	function taskItemRow(task) {
		const item = document.createElement('div');
		item.className = 'task-item';
		const left = document.createElement('input');
		left.type = 'text';
		left.value = task.label;
		left.style.flex = '1';
		const weight = document.createElement('input');
		weight.type = 'number';
		weight.value = String(task.weight);
		weight.min = '0';
		weight.max = '100';
		weight.style.width = '80px';
		const weightTag = document.createElement('span');
		weightTag.className = 'weight';
		weightTag.textContent = '%';
		const del = document.createElement('button');
		del.className = 'btn btn-danger';
		del.textContent = 'Remove';
		del.addEventListener('click', () => item.remove());
		item.appendChild(left);
		item.appendChild(weight);
		item.appendChild(weightTag);
		item.appendChild(del);
		return item;
	}

	function taskCheckboxRow(task) {
		const item = document.createElement('div');
		item.className = 'task-item';
		const left = document.createElement('label');
		left.style.display = 'flex';
		left.style.alignItems = 'center';
		left.style.gap = '10px';
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = !!task.done;
		const span = document.createElement('span');
		span.textContent = task.label;
		left.appendChild(checkbox);
		left.appendChild(span);
		const weight = document.createElement('span');
		weight.className = 'weight';
		weight.textContent = `+${task.weight}%`;
		item.appendChild(left);
		item.appendChild(weight);
		return item;
	}

	function collectTasks(tasksList) {
		const tasks = [];
		Array.from(tasksList.children).forEach(child => {
			if (!child.classList.contains('task-item')) return;
			const [labelInput, weightInput] = child.querySelectorAll('input');
			const label = (labelInput && labelInput.value ? labelInput.value.trim() : 'Task').slice(0, 200);
			const weight = clamp(parseInt(weightInput && weightInput.value || '0', 10) || 0, 0, 100);
			tasks.push({ id: cryptoRandomId(), label, weight, done: false });
		});
		// Normalize weights to sum to 100 if they don't already
		const sum = tasks.reduce((s, t) => s + t.weight, 0);
		if (sum !== 100 && sum > 0) {
			tasks.forEach(t => { t.weight = Math.round((t.weight / sum) * 100); });
			// Fix rounding drift
			let diff = 100 - tasks.reduce((s, t) => s + t.weight, 0);
			for (let i = 0; i < Math.abs(diff); i++) tasks[i % tasks.length].weight += Math.sign(diff);
		}
		return tasks;
	}

	function collectTasksFromChecklist(tasksList, previewEl) {
		const tasks = [];
		Array.from(tasksList.children).forEach(child => {
			if (!child.classList.contains('task-item')) return;
			const checkbox = child.querySelector('input[type="checkbox"]');
			const label = child.querySelector('span:nth-child(2)')?.textContent || 'Task';
			const weightText = child.querySelector('.weight')?.textContent || '+0%';
			const weight = parseInt(weightText.replace(/[^0-9]/g, ''), 10) || 0;
			tasks.push({ id: cryptoRandomId(), label, weight, done: !!(checkbox && checkbox.checked) });
		});
		if (previewEl) previewEl.textContent = `Progress: ${computeProgress(tasks)}%`;
		return tasks;
	}

	function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

	// Wire up new button
	if (newBtn) newBtn.addEventListener('click', openNewModal);

	// Initial render
	render();
})();