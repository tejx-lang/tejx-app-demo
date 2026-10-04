import React, { useState, useEffect } from 'react';
import { Utensils, Flame, Dumbbell, RefreshCw, Eye } from 'lucide-react';
import { fetchRandomRecipe, calculateNomadMacros, getDailyWorkoutRoutine } from '../../services/api';

// 16. Recipe Search & Generator
export function RecipeFinderWidget() {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadRecipe = async () => {
    setLoading(true);
    const data = await fetchRandomRecipe();
    setRecipe(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRecipe();
  }, []);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🍳</span>
          <div>
            <div className="widget-title">Recipe Explorer</div>
            <div className="widget-category-badge">TheMealDB API</div>
          </div>
        </div>
        <button className="widget-btn" onClick={loadRecipe} title="Next Random Meal">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="widget-body">
        {loading ? (
          <div className="widget-loading"><div className="spinner"></div></div>
        ) : recipe && (
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <img src={recipe.image} alt={recipe.title} style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>{recipe.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{recipe.category} • {recipe.area} Cuisine</div>
                <button 
                  className="btn-secondary" 
                  style={{ marginTop: '0.4rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setShowModal(true)}
                >
                  View Cooking Steps
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Ingredients: {recipe.ingredients?.slice(0, 4).join(', ')}...
            </div>
          </div>
        )}

        {showModal && recipe && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{recipe.title}</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <img src={recipe.image} alt={recipe.title} style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} />
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>Key Ingredients:</h4>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                  {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
              </div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>Instructions:</h4>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>{recipe.instructions}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 17. Nutrition & Macro Counter
export function NutritionCalculatorWidget() {
  const [calories, setCalories] = useState(2400);
  const macros = calculateNomadMacros(calories);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">🥗</span>
          <div>
            <div className="widget-title">Nomad Macro Counter</div>
            <div className="widget-category-badge">Edamam Nutrition Model</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Daily Target:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>{calories} kcal</span>
          </div>
          <input 
            type="range" 
            min="1500" 
            max="3800" 
            step="50" 
            value={calories} 
            onChange={(e) => setCalories(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Protein</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1rem' }}>{macros.proteinGrams}g</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Carbs</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-blue)', fontSize: '1rem' }}>{macros.carbGrams}g</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fats</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-neon-violet)', fontSize: '1rem' }}>{macros.fatGrams}g</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 18. Fitness & Workout Routine Planner
export function WorkoutPlannerWidget() {
  const [exercises] = useState(getDailyWorkoutRoutine());

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-title-area">
          <span className="widget-icon">💪</span>
          <div>
            <div className="widget-title">Daily Hotel Workout</div>
            <div className="widget-category-badge">ExerciseDB / Wger</div>
          </div>
        </div>
      </div>

      <div className="widget-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{ex.exercise}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>Target: {ex.target}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <div>{ex.sets}</div>
                <div style={{ color: 'var(--text-muted)' }}>{ex.reps}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
