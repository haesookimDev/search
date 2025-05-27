import React, { useState } from 'react';

function SearchForm({ onSearch, disabled }) {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSearch(inputValue.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="search-form">
            <input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="AI에게 무엇이든 물어보세요..."
                disabled={disabled}
            />
            <button type="submit" disabled={disabled}>
                {disabled ? '검색 중...' : '검색'}
            </button>
        </form>
    );
}

export default SearchForm;