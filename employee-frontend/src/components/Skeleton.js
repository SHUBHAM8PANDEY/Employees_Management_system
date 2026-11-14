import React from 'react';

export function Skeleton({ label = 'Loading', rows = 4 }) {
    return <div className="ui-skeleton" role="status" aria-label={label}>
        {Array.from({ length: rows }, (_, index) => <span aria-hidden="true" key={index} />)}
    </div>;
}
