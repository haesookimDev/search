import React from 'react';

function ProgressDisplay({ updates }) {
    if (!updates || updates.length === 0) {
        return <div className="progress-area initial-loading"><p>AI가 답변을 준비하고 있습니다...</p></div>;
    }

    return (
        <div className="progress-area detailed-progress">
            <h4>처리 과정:</h4>
            <ul>
                {updates.map((update, index) => (
                    <li key={index} className={`progress-step ${update.stage_id}`}>
                        <strong>
                            {update.stage_number && update.total_stages 
                                ? `[${update.stage_number}/${update.total_stages}] ` 
                                : ''}
                            {update.message}
                        </strong>
                        {/* 특정 스테이지에 대한 추가 정보 표시 (예: 검색된 문서 수) */}
                        {update.stage_id === 'information_retrieval' && update.data && update.data.found_count &&
                            <em> (관련 문서 {update.data.found_count}개 발견)</em>
                        }
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ProgressDisplay;