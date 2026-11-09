document.addEventListener('DOMContentLoaded', () => {
  // 1. App State & Initial Data (Loaded from localStorage if available)
  const defaultSavedMeals = [
    {
      name: 'Morning Protein Shake',
      category: 'Breakfast',
      calories: 250,
      protein: 30,
      ingredients: [
        { name: 'Whey Protein Scoop', calories: 120, protein: 24 },
        { name: 'Almond Milk (1 cup)', calories: 60, protein: 1 },
        { name: 'Banana', calories: 70, protein: 5 }
      ]
    },
    {
      name: 'Salmon Rice Bowl',
      category: 'Lunch',
      calories: 620,
      protein: 39,
      ingredients: [
        { name: 'Atlantic Salmon', calories: 300, protein: 34 },
        { name: 'Jasmine Rice (1 cup)', calories: 200, protein: 4 },
        { name: 'Avocado', calories: 120, protein: 1 }
      ]
    },
    {
      name: 'Greek Yogurt & Berries',
      category: 'Snack',
      calories: 180,
      protein: 20,
      ingredients: [
        { name: 'Plain Greek Yogurt', calories: 130, protein: 18 },
        { name: 'Mixed Berries', calories: 50, protein: 2 }
      ]
    }
  ];

  const state = {
    calorieGoal: 2000,
    proteinGoal: 160,
    consumedCalories: 0,
    consumedProtein: 0,
    meals: [],
    savedMeals: JSON.parse(localStorage.getItem('savedMeals')) || defaultSavedMeals
  };

  // Helper to persist savedMeals to localStorage
  function persistSavedMeals() {
    localStorage.setItem('savedMeals', JSON.stringify(state.savedMeals));
  }

  // 2. DOM Elements Selection
  const caloriesConsumedEl = document.getElementById('calories-consumed');
  const caloriesRemainingEl = document.getElementById('calories-remaining');
  const proteinConsumedEl = document.getElementById('protein-consumed');
  const proteinRemainingEl = document.getElementById('protein-remaining');

  const calorieProgressBar = document.querySelector('[aria-label="Calorie Progress"] .progress-bar');
  const calorieProgressContainer = document.querySelector('[aria-label="Calorie Progress"]');

  const proteinProgressBar = document.querySelector('[aria-label="Protein Progress"] .progress-bar');
  const proteinProgressContainer = document.querySelector('[aria-label="Protein Progress"]');

  const entriesTableBody = document.getElementById('entries-table-body');
  const caloriesTotalEl = document.getElementById('calories-total');
  const proteinTotalEl = document.getElementById('protein-total');

  const mealForm = document.querySelector('#log-form form');
  const quickAddForm = document.getElementById('quick-add-form');
  const addIngredientBtn = mealForm.querySelector('.btn-secondary');
  const ingredientsListContainer = mealForm.querySelector('.bg-light');
  const savedMealsContainer = document.getElementById('saved-meals-container');

  let userOverrodeTotals = false;
  const foodNameInput = document.getElementById('food-name');
  const mealTypeSelect = document.getElementById('meal-type');
  const totalCalsInput = document.getElementById('calories');
  const totalProtInput = document.getElementById('protein');
  const favoriteCheckbox = document.getElementById('favorite-meal');

  totalCalsInput.addEventListener('input', () => { userOverrodeTotals = true; });
  totalProtInput.addEventListener('input', () => { userOverrodeTotals = true; });

  const quickAddPresets = {
    'shake': state.savedMeals[0] || defaultSavedMeals[0],
    'salmon-bowl': state.savedMeals[1] || defaultSavedMeals[1],
    'yogurt': state.savedMeals[2] || defaultSavedMeals[2]
  };

  // 3. Dynamic Ingredient Management
  let ingredientCount = 1;

  addIngredientBtn.addEventListener('click', () => {
    addNewIngredientRow();
  });

  function addNewIngredientRow(name = '', cals = '', prot = '') {
    ingredientCount++;
    const newFieldset = document.createElement('fieldset');
    newFieldset.className = 'border rounded p-2 mb-3 bg-white ingredient-row';
    newFieldset.innerHTML = `
      <legend class="float-none w-auto px-2 small fw-bold">Ingredient ${ingredientCount}</legend>
      <div class="row g-2">
        <div class="col-md-5">
          <label class="form-label small">Name:</label>
          <input type="text" class="form-control form-control-sm ing-name-input" value="${name}" placeholder="e.g., Olive Oil">
        </div>
        <div class="col-md-3">
          <label class="form-label small">Calories:</label>
          <input type="number" min="0" class="form-control form-control-sm ing-cals-input" value="${cals}" placeholder="100">
        </div>
        <div class="col-md-3">
          <label class="form-label small">Protein (g):</label>
          <input type="number" min="0" class="form-control form-control-sm ing-prot-input" value="${prot}" placeholder="0">
        </div>
        <div class="col-md-1 d-flex align-items-end">
          <button type="button" class="btn btn-outline-danger btn-sm remove-ing-btn">&times;</button>
        </div>
      </div>
    `;
    ingredientsListContainer.insertBefore(newFieldset, addIngredientBtn);
    attachIngredientListeners();
    calculateIngredientTotals();
  }

  function attachIngredientListeners() {
    const ingredientRows = ingredientsListContainer.querySelectorAll('fieldset.ingredient-row');

    ingredientRows.forEach((row) => {
      const nameInput = row.querySelector('.ing-name-input') || row.querySelectorAll('input')[0];
      const calsInput = row.querySelector('.ing-cals-input') || row.querySelectorAll('input')[1];
      const protInput = row.querySelector('.ing-prot-input') || row.querySelectorAll('input')[2];
      const removeBtn = row.querySelector('.remove-ing-btn');

      if (calsInput && !calsInput.hasAttribute('data-listening')) {
        calsInput.setAttribute('data-listening', 'true');
        calsInput.addEventListener('input', () => {
          userOverrodeTotals = false;
          calculateIngredientTotals();
        });
      }

      if (protInput && !protInput.hasAttribute('data-listening')) {
        protInput.setAttribute('data-listening', 'true');
        protInput.addEventListener('input', () => {
          userOverrodeTotals = false;
          calculateIngredientTotals();
        });
      }

      if (nameInput && !nameInput.hasAttribute('data-listening')) {
        nameInput.setAttribute('data-listening', 'true');
        nameInput.addEventListener('input', calculateIngredientTotals);
      }

      if (removeBtn && !removeBtn.hasAttribute('data-listening')) {
        removeBtn.setAttribute('data-listening', 'true');
        removeBtn.addEventListener('click', () => {
          row.remove();
          calculateIngredientTotals();
        });
      }
    });
  }

  function calculateIngredientTotals() {
    if (userOverrodeTotals) return;

    let sumCals = 0;
    let sumProt = 0;
    const ingredientRows = ingredientsListContainer.querySelectorAll('fieldset.ingredient-row');
    const includedListUl = ingredientsListContainer.querySelector('ul.small');
    if (includedListUl) includedListUl.innerHTML = '';

    ingredientRows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 3) {
        const name = inputs[0].value.trim();
        const cals = parseInt(inputs[1].value) || 0;
        const prot = parseInt(inputs[2].value) || 0;

        sumCals += cals;
        sumProt += prot;

        if (includedListUl && (name || cals > 0 || prot > 0)) {
          const li = document.createElement('li');
          li.textContent = `${name || 'Unnamed Ingredient'} — ${cals} kcal | ${prot}g Protein`;
          includedListUl.appendChild(li);
        }
      }
    });

    totalCalsInput.value = sumCals > 0 ? sumCals : '';
    totalProtInput.value = sumProt > 0 ? sumProt : '';
  }

  document.querySelectorAll('#log-form fieldset fieldset').forEach((fs) => {
    fs.classList.add('ingredient-row');
    const inputs = fs.querySelectorAll('input');
    if (inputs.length >= 3) {
      inputs[0].classList.add('ing-name-input');
      inputs[1].classList.add('ing-cals-input');
      inputs[2].classList.add('ing-prot-input');
    }
  });
  attachIngredientListeners();

  function loadMealIntoForm(meal) {
    foodNameInput.value = meal.name;
    mealTypeSelect.value = meal.category.toLowerCase();
    totalCalsInput.value = meal.calories;
    totalProtInput.value = meal.protein;
    userOverrodeTotals = true;

    const existingRows = ingredientsListContainer.querySelectorAll('fieldset.ingredient-row');
    existingRows.forEach(row => row.remove());
    ingredientCount = 0;

    if (meal.ingredients && meal.ingredients.length > 0) {
      meal.ingredients.forEach(ing => {
        addNewIngredientRow(ing.name, ing.calories, ing.protein);
      });
    } else {
      addNewIngredientRow('', '', '');
    }

    document.getElementById('log-form').scrollIntoView({ behavior: 'smooth' });
  }

  // 4. Main UI Update Function
  function updateUI() {
    let totalCals = state.meals.reduce((sum, meal) => sum + meal.calories, 0);
    let totalProt = state.meals.reduce((sum, meal) => sum + meal.protein, 0);

    state.consumedCalories = totalCals;
    state.consumedProtein = totalProt;

    caloriesConsumedEl.textContent = totalCals.toLocaleString();
    caloriesRemainingEl.textContent = Math.max(0, state.calorieGoal - totalCals).toLocaleString();

    proteinConsumedEl.textContent = totalProt;
    proteinRemainingEl.textContent = Math.max(0, state.proteinGoal - totalProt);

    const calsPercent = Math.min(100, (totalCals / state.calorieGoal) * 100).toFixed(1);
    calorieProgressBar.style.width = `${calsPercent}%`;
    calorieProgressBar.textContent = `${calsPercent}%`;
    calorieProgressContainer.setAttribute('aria-valuenow', calsPercent);

    const protPercent = Math.min(100, (totalProt / state.proteinGoal) * 100).toFixed(1);
    proteinProgressBar.style.width = `${protPercent}%`;
    proteinProgressBar.textContent = `${protPercent}%`;
    proteinProgressContainer.setAttribute('aria-valuenow', protPercent);

    // Render Today's Logged Items Table
    entriesTableBody.innerHTML = '';
    if (state.meals.length === 0) {
      const emptyTr = document.createElement('tr');
      emptyTr.innerHTML = `<td colspan="5" class="text-center text-muted py-3">No meals logged yet today. Use the form above to add one!</td>`;
      entriesTableBody.appendChild(emptyTr);
    } else {
      state.meals.forEach((meal, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${capitalize(meal.category)}</td>
          <td>${escapeHTML(meal.name)}</td>
          <td>${meal.calories}</td>
          <td>${meal.protein}</td>
          <td>
            <button type="button" class="btn btn-sm btn-outline-primary me-1 edit-logged-meal" data-index="${index}">Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger delete-logged-meal" data-index="${index}">Delete</button>
          </td>
        `;
        entriesTableBody.appendChild(tr);
      });

      document.querySelectorAll('.delete-logged-meal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.getAttribute('data-index'));
          state.meals.splice(idx, 1);
          updateUI();
        });
      });

      document.querySelectorAll('.edit-logged-meal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.getAttribute('data-index'));
          const mealToEdit = state.meals[idx];
          loadMealIntoForm(mealToEdit);
          state.meals.splice(idx, 1);
          updateUI();
        });
      });
    }

    caloriesTotalEl.textContent = totalCals.toLocaleString();
    proteinTotalEl.textContent = totalProt;

    // Render Saved / Favorite Meals Section with Use, Edit, and Delete Actions
    if (savedMealsContainer) {
      savedMealsContainer.innerHTML = '';
      if (state.savedMeals.length === 0) {
        savedMealsContainer.innerHTML = `<div class="col-12 text-muted small fst-italic">No saved meals yet. Check "Save this meal to Favorites" when logging a meal!</div>`;
      } else {
        state.savedMeals.forEach((savedMeal, index) => {
          const col = document.createElement('div');
          col.className = 'col-md-4';

          let ingredientsHTML = '';
          if (savedMeal.ingredients && savedMeal.ingredients.length > 0) {
            ingredientsHTML = `<ul class="small text-muted ps-3 mb-3">` +
              savedMeal.ingredients.map(i => `<li>${escapeHTML(i.name)} — ${i.calories} kcal | ${i.protein}g</li>`).join('') +
              `</ul>`;
          } else {
            ingredientsHTML = `<p class="small text-muted fst-italic mb-3">No ingredient breakdown saved.</p>`;
          }

          col.innerHTML = `
            <div class="card h-100 border shadow-sm">
              <div class="card-body d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-secondary">${capitalize(savedMeal.category)}</span>
                    <div>
                      <button type="button" class="btn btn-sm btn-outline-secondary me-1 edit-saved-meal" data-index="${index}" title="Edit saved meal">✏️</button>
                      <button type="button" class="btn btn-sm btn-outline-danger delete-saved-meal" data-index="${index}" title="Delete saved meal">&times;</button>
                    </div>
                  </div>
                  <h3 class="h6 card-title fw-bold">${escapeHTML(savedMeal.name)}</h3>
                  <p class="small fw-semibold text-primary mb-2">Total: ${savedMeal.calories} kcal | ${savedMeal.protein}g Protein</p>
                  ${ingredientsHTML}
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm w-100 use-saved-meal" data-index="${index}">Use Meal</button>
              </div>
            </div>
          `;
          savedMealsContainer.appendChild(col);
        });

        // Event listener for "Use Meal" button
        document.querySelectorAll('.use-saved-meal').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            loadMealIntoForm(state.savedMeals[idx]);
          });
        });

        // Event listener for "Edit Saved Meal" button (loads into form & removes old version from saved list)
        document.querySelectorAll('.edit-saved-meal').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            const mealToEdit = state.savedMeals[idx];
            favoriteCheckbox.checked = true; // Auto-check favorite so saving updates it
            loadMealIntoForm(mealToEdit);
            state.savedMeals.splice(idx, 1);
            persistSavedMeals();
            updateUI();
          });
        });

        // Event listener for "Delete Saved Meal" button
        document.querySelectorAll('.delete-saved-meal').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            state.savedMeals.splice(idx, 1);
            persistSavedMeals();
            updateUI();
          });
        });
      }
    }
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  mealForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = foodNameInput.value.trim();
    const category = mealTypeSelect.value;
    const calories = parseInt(totalCalsInput.value) || 0;
    const protein = parseInt(totalProtInput.value) || 0;
    const isFavorite = favoriteCheckbox.checked;

    if (!name) return;

    const currentIngredients = [];
    ingredientsListContainer.querySelectorAll('fieldset.ingredient-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 3) {
        const ingName = inputs[0].value.trim();
        const ingCals = parseInt(inputs[1].value) || 0;
        const ingProt = parseInt(inputs[2].value) || 0;
        if (ingName || ingCals > 0 || ingProt > 0) {
          currentIngredients.push({ name: ingName || 'Ingredient', calories: ingCals, protein: ingProt });
        }
      }
    });

    const newMeal = { category, name, calories, protein, ingredients: currentIngredients };
    state.meals.push(newMeal);

    if (isFavorite) {
      const existingIndex = state.savedMeals.findIndex(m => m.name.toLowerCase() === name.toLowerCase());
      if (existingIndex >= 0) {
        state.savedMeals[existingIndex] = { ...newMeal };
      } else {
        state.savedMeals.push({ ...newMeal });
      }
      persistSavedMeals();
    }

    updateUI();

    // Reset form & leave 1 ingredient row
    mealForm.reset();
    userOverrodeTotals = false;

    const ingredientRows = ingredientsListContainer.querySelectorAll('fieldset.ingredient-row');
    ingredientRows.forEach((row, idx) => {
      if (idx >= 1) {
        row.remove();
      } else {
        row.querySelectorAll('input').forEach(input => input.value = '');
      }
    });
    ingredientCount = 1;

    const ul = ingredientsListContainer.querySelector('ul.small');
    if (ul) ul.innerHTML = '';
  });

  quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectEl = document.getElementById('quick-add');
    const selectedKey = selectEl.value;

    if (quickAddPresets[selectedKey]) {
      loadMealIntoForm(quickAddPresets[selectedKey]);
      quickAddForm.reset();
    }
  });

  updateUI();
});
