// Expense Category Screen
// Basic skeleton for Expense Category management (list, add, edit, delete)
import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost/app/backend/api';

export default function ExpenseCategoryScreen() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/expense_category.php`);
      const data = await res.json();
      setCategories(data.data || []);
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const body = JSON.stringify({ name, ...(editId && { id: editId }) });
      const res = await fetch(`${API_BASE_URL}/expense_category.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        setName('');
        setEditId(null);
      } else {
        setError(data.message || 'Error');
      }
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleEdit = (cat) => {
    setName(cat.name);
    setEditId(cat.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/expense_category.php`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        setError(data.message || 'Error');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Expense Categories</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Category Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <button type="submit">{editId ? 'Update' : 'Add'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setName(''); }}>Cancel</button>}
      </form>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => (
            <tr key={cat.id}>
              <td>{cat.id}</td>
              <td>{cat.name}</td>
              <td>
                <button onClick={() => handleEdit(cat)}>Edit</button>
                <button onClick={() => handleDelete(cat.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr><td colSpan="3">No categories found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
