import React from 'react';
import { MaxPlayLogo, MaxPlayLogoProps } from './MaxPlayLogo';

export interface LogoPlaceholderProps extends MaxPlayLogoProps {}

export const LogoPlaceholder: React.FC<LogoPlaceholderProps> = (props) => {
  return <MaxPlayLogo {...props} />;
};
