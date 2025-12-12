import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Intro from '../Intro';

it('renders correctly', () => {
  let tree;

  act(() => {
    tree = renderer.create(<Intro />);
  });

  expect(tree.toJSON()).toMatchSnapshot();
});
