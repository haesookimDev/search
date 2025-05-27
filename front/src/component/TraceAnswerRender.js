// ResultsDisplay.js 또는 TraceableAnswerRenderer.js
import React, { useState } from 'react';

const TraceableAnswerRenderer = ({ answerSegments, sources }) => {
    const [activeTooltip, setActiveTooltip] = useState(null);

    const handleCitationMouseEnter = (e, segmentIdx, citationIdx, citation) => {
        const source = sources.find(s => s.id === citation.source_id);
        if (source) {
            const rect = e.target.getBoundingClientRect();
            setActiveTooltip({
                segmentIdx,
                citationIdx,
                content: (
                    <>
                        <strong>출처 {source.id}: {source.title || new URL(source.url).hostname}</strong>
                        {citation.snippet_from_source && <p><em>"{citation.snippet_from_source}"</em></p>}
                        <a href={source.url} target="_blank" rel="noopener noreferrer">자세히 보기</a>
                    </>
                ),
                position: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
            });
        }
    };

    const handleCitationMouseLeave = () => {
        setActiveTooltip(null);
    };

    const scrollToSource = (sourceId) => {
        const sourceElement = document.getElementById(`source-item-${sourceId}`);
        if (sourceElement) {
            sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sourceElement.classList.add('highlight');
            setTimeout(() => sourceElement.classList.remove('highlight'), 2000);
        }
    };

    if (!answerSegments || answerSegments.length === 0) {
        return <p>답변을 표시할 수 없습니다.</p>;
    }

    return (
        <div className="ai-answer-content traceable">
            {answerSegments.map((segment, segmentIdx) => (
                <span key={segmentIdx} className="answer-segment">
                    {segment.text_segment.split(/(\s?\[출처 \d+(:\s*'.*?')?\]\s?)/g).map((part, partIdx) => {
                        if (partIdx === 0) return <span key={`${segmentIdx}-text`}>{segment.text_segment}</span>;
                        return null;
                    })}
                    {segment.citations && segment.citations.length > 0 && (
                        <span className="citations-for-segment">
                            {segment.citations.map((citation, citationIdx) => (
                                <sup 
                                    key={citationIdx}
                                    className="citation-marker"
                                    onMouseEnter={(e) => handleCitationMouseEnter(e, segmentIdx, citationIdx, citation)}
                                    onMouseLeave={handleCitationMouseLeave}
                                    onClick={() => scrollToSource(citation.source_id)}
                                >
                                    [{citation.source_id}]
                                </sup>
                            ))}
                        </span>
                    )}
                </span>
            ))}
            {activeTooltip && (
                <div 
                    className="citation-tooltip" 
                    style={{ top: activeTooltip.position.top + 5, left: activeTooltip.position.left }}
                >
                    {activeTooltip.content}
                </div>
            )}
        </div>
    );
};


function ResultsDisplay({ userQuery, answerSegments, sources }) {

    return (
        <div className="results-area">
            {userQuery && <h4>"{userQuery}"에 대한 AI의 답변:</h4>}
            
            <div className="answer-section">
                <h3>AI 생성 답변:</h3>
                {answerSegments ? 
                    <TraceableAnswerRenderer answerSegments={answerSegments} sources={sources || []} /> : 
                    <p>답변을 생성하지 못했습니다.</p>
                }
            </div>
        </div>
    );
}
export default ResultsDisplay;