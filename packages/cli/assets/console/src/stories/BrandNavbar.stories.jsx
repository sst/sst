import React from 'react';

import "../sass/custom.scss";
import BrandNavbar from '../components/BrandNavbar';

export default {
  title: 'UI/BrandNavbar',
  component: BrandNavbar,
};

const Template = (args) => <BrandNavbar />;

export const Main = Template.bind({});
Main.args = {
};
