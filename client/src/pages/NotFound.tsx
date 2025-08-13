import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  };

  const decorativeCircleStyle: React.CSSProperties = {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    animation: 'float 6s ease-in-out infinite',
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15), 0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    textAlign: 'center' as const,
    maxWidth: '480px',
    width: '100%',
    position: 'relative',
    zIndex: 1,
    animation: 'slideUp 0.8s ease-out',
  };

  const numberStyle: React.CSSProperties = {
    fontSize: '8rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.05em',
    marginBottom: '1rem',
    lineHeight: 1,
    animation: 'pulse 2s ease-in-out infinite',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '1rem',
    letterSpacing: '-0.025em',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '1.125rem',
    color: '#6b7280',
    marginBottom: '2.5rem',
    lineHeight: 1.6,
    maxWidth: '400px',
    margin: '0 auto 2.5rem',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '1rem',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '0.875rem 2.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    minWidth: '180px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '0.875rem 2.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#667eea',
    background: 'transparent',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: '180px',
  };

  const iconStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
    animation: 'bounce 2s infinite',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  // Add CSS keyframes as a style tag
  const keyframes = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    @keyframes bounce {
      0%, 20%, 53%, 80%, 100% {
        transform: translateY(0);
      }
      40%, 43% {
        transform: translateY(-10px);
      }
      70% {
        transform: translateY(-5px);
      }
      90% {
        transform: translateY(-2px);
      }
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }
  `;

  const handlePrimaryButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)';
  };

  const handlePrimaryButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)';
  };

  const handleSecondaryButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    button.style.borderColor = '#667eea';
    button.style.background = 'rgba(102, 126, 234, 0.05)';
  };

  const handleSecondaryButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    button.style.borderColor = '#e5e7eb';
    button.style.background = 'transparent';
  };

  return (
    <>
      <style>{keyframes}</style>
      <div style={containerStyle}>
        {/* Decorative floating elements */}
        <div
          style={{
            ...decorativeCircleStyle,
            width: '120px',
            height: '120px',
            top: '10%',
            left: '10%',
            animationDelay: '0s',
          }}
        />
        <div
          style={{
            ...decorativeCircleStyle,
            width: '80px',
            height: '80px',
            top: '20%',
            right: '15%',
            animationDelay: '2s',
          }}
        />
        <div
          style={{
            ...decorativeCircleStyle,
            width: '60px',
            height: '60px',
            bottom: '15%',
            left: '20%',
            animationDelay: '4s',
          }}
        />

        <div style={cardStyle}>
          {/* Enhanced icon */}
          <div style={iconStyle}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="56"
                stroke="url(#iconGradient)"
                strokeWidth="8"
                fill="rgba(102, 126, 234, 0.1)"
              />
              <path
                d="M45 75c2-6 8-10 15-10s13 4 15 10"
                stroke="url(#iconGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="48" cy="50" r="4" fill="url(#iconGradient)" />
              <circle cx="72" cy="50" r="4" fill="url(#iconGradient)" />
            </svg>
          </div>

          <div style={numberStyle}>404</div>

          <h1 style={titleStyle}>Page Not Found</h1>

          <p style={descriptionStyle}>
            Oops! The page you're looking for seems to have wandered off.
            Don't worry though – let's get you back to building that perfect resume!
          </p>

          <div style={buttonContainerStyle}>
            <button
              onClick={() => navigate('/')}
              style={primaryButtonStyle}
              onMouseEnter={handlePrimaryButtonHover}
              onMouseLeave={handlePrimaryButtonLeave}
              aria-label="Return to homepage"
            >
              Back to Home
            </button>

            <button
              onClick={() => navigate(-1)}
              style={secondaryButtonStyle}
              onMouseEnter={handleSecondaryButtonHover}
              onMouseLeave={handleSecondaryButtonLeave}
              aria-label="Go back to previous page"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;