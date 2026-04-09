import { Outlet } from 'react-router-dom';

const CREAM_RGBA = 'rgba(244,243,240,0.88)';

export function Browse() {
    const bgStyle = {
        background: `linear-gradient(${CREAM_RGBA}, ${CREAM_RGBA}), url("/bg-pattern.png") center/cover no-repeat`,
        minHeight: '100vh',
    };

    return (
        <div style={bgStyle}>
            <div className="max-w-6xl mx-auto px-7 sm:px-8 py-10 sm:py-12">
                <Outlet />
            </div>
        </div>
    );
}
