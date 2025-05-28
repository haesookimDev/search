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
        setQuery(searchQuery); // 현재 검색어 상태 업데이트
        setIsLoading(true);
        setProgressUpdates([]); // 이전 진행 상태 초기화
        setFinalResult(null);   // 이전 결과 초기화
        setError(null);         // 이전 오류 초기화

        let finalMessageProcessedSuccessfully = false; // 로컬 플래그: 성공적인 최종 메시지 처리 여부
        let errorOccurredInStream = false; // 로컬 플래그: 스트림 처리 중 오류 발생 여부

        try {
            const response = await fetch('http://localhost:8001/api/v1/search/stream', {
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
                throw new Error(errorDetail); // 네트워크 또는 서버 오류 발생
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    setIsLoading(false);
                    // 로컬 플래그를 확인하여 스트림이 정상적으로 완료되었는지 판단
                    if (!finalMessageProcessedSuccessfully && !errorOccurredInStream && !error) { // 기존에 설정된 error 상태도 확인
                        setError({
                            title: "스트림 종료 오류",
                            message: "검색 결과 스트림이 최종 데이터 없이 종료되었습니다."
                        });
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop(); // 마지막 불완전한 라인을 다음 처리를 위해 버퍼에 남김

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonData = line.substring(6);
                        try {
                            const progressData = JSON.parse(jsonData);
                            setProgressUpdates(prev => [...prev, progressData]);

                            if (progressData.is_final && progressData.data) {
                                setError(null); // 성공 시 기존 오류 초기화
                                setFinalResult(progressData.data);
                                finalMessageProcessedSuccessfully = true; // 성공 플래그 설정
                                errorOccurredInStream = false;
                                setIsLoading(false);
                                await reader.cancel(); // 스트림 정상 종료
                                break; 
                            } else if (progressData.stage_id === 'error' || (progressData.is_final && !progressData.data)) {
                                // 스트림 내에서 오류 메시지 수신 또는 is_final이지만 데이터가 없는 경우
                                const errorMessage = progressData.message || (progressData.data && progressData.data.error) || "결과 생성 중 명시되지 않은 오류 발생";
                                setError({ title: "처리 중 오류", message: errorMessage });
                                setFinalResult(null);
                                errorOccurredInStream = true; // 오류 플래그 설정
                                finalMessageProcessedSuccessfully = false;
                                setIsLoading(false);
                                await reader.cancel();
                                break;
                            }
                        } catch (e) {
                            console.error('SSE 데이터 처리 오류:', e, jsonData);
                            setError({ title: "데이터 파싱 오류", message: "수신된 데이터 처리 중 예외가 발생했습니다." });
                            setFinalResult(null);
                            errorOccurredInStream = true; // 오류 플래그 설정
                            finalMessageProcessedSuccessfully = false;
                            setIsLoading(false);
                            await reader.cancel();
                            break; 
                        }
                    }
                }
                if (finalMessageProcessedSuccessfully || errorOccurredInStream) { // 루프 탈출 조건
                    break;
                }
            }
        } catch (err) { // fetch 또는 네트워크 단계에서의 오류
            console.error('검색 작업 중 오류:', err);
            setError({
                title: "검색 요청 실패",
                message: err.message || "알 수 없는 오류로 검색을 시작할 수 없습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요."
            });
            setIsLoading(false);
        }
    }, [error]);

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