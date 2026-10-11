import { Link } from 'react-router-dom';
import { PRIVACY_COPY } from './privacy-copy';

export default function PrivacyNote() {
  return (
    <p className="l-muted m-0 text-sm leading-relaxed">
      {PRIVACY_COPY.note}{' '}
      <Link to="/privacy-policy" className="l-link">
        {PRIVACY_COPY.link}
      </Link>
    </p>
  );
}
