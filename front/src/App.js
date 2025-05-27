import React, { useState, useCallback } from 'react';
import SearchForm from './component/SearchForm';
import ProgressDisplay from './component/ProgressDisplay';
import ResultsDisplay from './component/ResultsDisplay';
import ErrorBoundary from './component/ErrorBoundary';
import './App.css';

function App() {
    const [query, setQuery] = useState('');
    const [progressUpdates, setProgressUpdates] = useState([]); 
    const [finalResult, setFinalResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = useCallback(async (searchQuery) => {
        setQuery(searchQuery);
        setIsLoading(true);
        setProgressUpdates([]);
        setFinalResult(null);
        setError(null);

        try {
            const response = await fetch('/api/v1/search/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (!response.ok) {
                let errorDetail = `서버 응답 오류: ${response.status}`;
                try {
                    const errData = await response.json();
                    errorDetail = errData.detail || errorDetail;
                } catch (e) { /* JSON 파싱 실패 시 무시 */ }
                throw new Error(errorDetail);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (!progressUpdates.some(p => p.is_final)) {
                         setError("검색 결과 스트림이 비정상적으로 종료되었습니다.");
                    }
                    setIsLoading(false);
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop();

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        const jsonData = line.substring(6);
                        try {
                            const progressData = JSON.parse(jsonData);
                            setProgressUpdates(prev => [...prev, progressData]);

                            if (progressData.stage_id === 'error' || (progressData.is_final && !progressData.data)) {
                                setError(progressData.message || "결과 생성 중 오류가 발생했습니다.");
                                setFinalResult(null);
                                setIsLoading(false);
                                reader.cancel(); 
                                return;
                            }

                            if (progressData.is_final && progressData.data) {
                                setFinalResult(progressData.data);
                                setIsLoading(false);
                                reader.cancel();
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data chunk:', e, jsonData);
                            setError("수신 데이터 처리 중 오류가 발생했습니다.");
                            setIsLoading(false);
                        }
                    }
                });
                if (error || (finalResult && !isLoading)) {break;}
            }
        } catch (err) {
            console.error('Search operation error:', err);
            setError({
                title: "검색 요청 실패",
                message: err.message || "알 수 없는 오류로 검색을 시작할 수 없습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요."
            });
            setIsLoading(false);
        }

    }, [progressUpdates, finalResult, error, isLoading]);


    return (
      <ErrorBoundary>
        <div className="app-container">
            <header><h1>AI 검색 서비스</h1></header>
            <SearchForm onSearch={handleSearch} disabled={isLoading} />
            
            {isLoading && <ProgressDisplay updates={progressUpdates} />}
            
            {error && (
                <div className="error-display-area" role="alert">
                    <h4>⚠️ {error.title || "오류 발생"}</h4>
                    <p>{error.message}</p>
                    <button onClick={() => handleSearch(query)}>다시 시도</button>
                </div>
                )
            }

            {!isLoading && !error && finalResult && (
                <ResultsDisplay 
                    userQuery={finalResult.user_query}
                    answer={finalResult.generated_answer}
                    sources={finalResult.sources}
                />
            )}
        </div>
      </ErrorBoundary>
    );
}

export default App;