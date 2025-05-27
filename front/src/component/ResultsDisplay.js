import React, { useState } from 'react';

// 간단한 Markdown 유사 파서 (목록, 강조 등) 또는 라이브러리(react-markdown) 사용 고려
const SimpleMarkdownRenderer = ({ text, sources }) => {
    if (!text) return null;

    const scrollToSource = (e, sourceId) => {
        e.preventDefault();
        const sourceElement = document.getElementById(`source-item-${sourceId}`);
        if (sourceElement) {
            sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sourceElement.classList.add('highlight');
            setTimeout(() => sourceElement.classList.remove('highlight'), 2000);
        }
    };

    const parts = text.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
            const sourceNumber = parseInt(citationMatch[1], 10);
            const source = sources.find(s => s.id === sourceNumber);
            if (source) {
                return (
                    <span
                        key={index}
                        className="citation-link"
                        title={`출처 ${source.id}: ${source.title || source.url}`}
                        onClick={(e) => scrollToSource(e, source.id)}
                    >
                        {part}
                    </span>
                );
            }
        }
        
        return part.split('\n').map((line, lineIndex) => (
            <React.Fragment key={`${index}-${lineIndex}`}>
                {line}
                {lineIndex < part.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    });
};


function ResultsDisplay({ userQuery, answer, sources }) {
    const [showAllSources, setShowAllSources] = useState(false);
    const initialSourcesToShow = 3;

    const displayedSources = showAllSources ? sources : sources.slice(0, initialSourcesToShow);

    const handleToggleSources = () => {
        setShowAllSources(!showAllSources);
    };

    const [feedbackGiven, setFeedbackGiven] = useState(null);

    const handleFeedback = async (feedbackType) => {
        if (feedbackGiven) return;

        setFeedbackGiven(feedbackType);

        const feedbackPayload = {
            user_query: userQuery,
            generated_answer: answer,
            feedback_type: feedbackType,
            sources_provided: sources.map(s => ({ title: s.title, url: s.url })),
            // user_comment: "..." // 추가 코멘트 입력 UI가 있다면 해당 값 사용
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/v1/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackPayload)
            });

            if (response.ok) {
                console.log("Feedback submitted successfully!");
            } else {
                const errorData = await response.json().catch(()=>({detail: "피드백 제출 실패"}));
                console.error("Failed to submit feedback:", errorData.detail);
                setFeedbackGiven(null);
            }
        } catch (error) {
            console.error("Network error submitting feedback:", error);
            setFeedbackGiven(null);
        }
    };
    return (
        <div className="results-area">
            {userQuery && <h4>"{userQuery}"에 대한 AI의 답변:</h4>}
            
            <div className="answer-section">
                <h3>AI 생성 답변:</h3>
                <div className="ai-answer-content">
                    {answer ? <SimpleMarkdownRenderer text={answer} sources={sources || []} /> : <p>답변을 생성하지 못했습니다.</p>}
                </div>
            </div>

            <div className="feedback-section">
                <p>이 답변이 유용했나요? 
                   <button onClick={() => handleFeedback('helpful')} disabled={!!feedbackGiven} 
                           className={feedbackGiven === 'helpful' ? 'selected' : ''}>
                       👍 {feedbackGiven === 'helpful' ? '유용함!' : ''}
                   </button> 
                   <button onClick={() => handleFeedback('unhelpful')} disabled={!!feedbackGiven}
                           className={feedbackGiven === 'unhelpful' ? 'selected' : ''}>
                       👎 {feedbackGiven === 'unhelpful' ? '개선필요' : ''}
                   </button>
                </p>
                 {feedbackGiven && <p style={{fontSize: '0.9em', color: 'green'}}><em>소중한 피드백 감사합니다!</em></p>}
            </div>

            {sources && sources.length > 0 && (
                <div className="sources-section">
                    <h3>참고한 출처:</h3>
                    <ul className="sources-list">
                        {displayedSources.map((source) => (
                            <li key={source.id} id={`source-item-${source.id}`} className="source-item">
                                <span className="source-number">[{source.id}]</span>
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-link">
                                    {source.title || "제목 없음"}
                                </a>
                                <span className="source-domain"> ({new URL(source.url).hostname})</span>
                            </li>
                        ))}
                    </ul>
                    {sources.length > initialSourcesToShow && (
                        <button onClick={handleToggleSources} className="toggle-sources-button">
                            {showAllSources ? '간략히 보기' : `전체 출처 보기 (${sources.length}개)`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default ResultsDisplay;