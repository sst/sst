import React from 'react';

import "../sass/custom.scss";
import Button from '../components/Button';

export default {
  title: 'Bootstrap/Button',
  component: Button,
};

const Template = (args) => 
  <>
    <Button {...args}>{ args.children }</Button>
    <Button {...args} active>{ args.children }</Button>
    <Button {...args} loading>{ args.children }</Button>
    <Button {...args} disabled>{ args.children }</Button>
    <br /><br />
    <Button {...args} size="md">{ args.children }</Button>
    <Button {...args} size="md" active>{ args.children }</Button>
    <Button {...args} size="md" loading>{ args.children }</Button>
    <Button {...args} size="md" disabled>{ args.children }</Button>
    <br /><br />
    <Button {...args} size="sm">{ args.children }</Button>
    <Button {...args} size="sm" active>{ args.children }</Button>
    <Button {...args} size="sm" loading>{ args.children }</Button>
    <Button {...args} size="sm" disabled>{ args.children }</Button>
  </>
;

export const Primary = Template.bind({});
Primary.args = {
  variant: "primary",
  children: "Label",
};

export const Secondary = Template.bind({});
Secondary.args = {
  variant: "secondary",
  children: "Label",
};

export const Danger = Template.bind({});
Danger.args = {
  variant: "danger",
  children: "Label",
};

export const Link = Template.bind({});
Link.args = {
  variant: "link",
  children: "Label",
};
