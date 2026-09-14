import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LandingPlexusBackground from '../components/LandingPlexusBackground';
import DemoLeadForm from '../components/DemoLeadForm';
import BrandLogo from '../../components/BrandLogo';
import { getStoredUtmParams } from '../utils/calendlyLeadNotify';
import { LANDING_ROUTES } from '../../constants/routes';
import './CampaignContactPage.css';

const CampaignContactPage = ({ variant = 'llamada' }) => {
  useEffect(() => {
    getStoredUtmParams();
  }, []);

  return (
    <div className="campaign-contact gradient-bg">
      <LandingPlexusBackground />
      <div className="campaign-contact__surface">
        <header className="campaign-contact__header">
          <Link to={LANDING_ROUTES.home} className="campaign-contact__logo-link">
            <BrandLogo className="campaign-contact__logo" variant="header" />
          </Link>
        </header>

        <main className="campaign-contact__main">
          <div className="campaign-contact__card">
            <DemoLeadForm variant={variant} />
          </div>
        </main>

        <footer className="campaign-contact__footer">
          <p>TimeCor · Gestión laboral sin complicaciones</p>
        </footer>
      </div>
    </div>
  );
};

export default CampaignContactPage;
