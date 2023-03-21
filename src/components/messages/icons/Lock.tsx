import { memo } from 'react';

import { Color } from '../../../styles/Color';

interface Props {
  width?: string | number;
  height?: string | number;
  color?: string;
  classes?: string;
}

function _LockIcon({ width, height, color, classes }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 15 18"
      width={width}
      height={height}
      className={classes}
    >
      <path
        d="M7.14 1.13c.76 0 1.49.23 2.02.65.54.43.84 1 .84 1.6v4.5H4.29v-4.5c0-.6.3-1.17.83-1.6a3.29 3.29 0 0 1 2.02-.66Zm4.29 6.75v-4.5c0-.9-.45-1.76-1.26-2.4C9.37.37 8.28 0 7.14 0 6.01 0 4.92.36 4.11.99c-.8.63-1.25 1.49-1.25 2.38v4.5c-.76 0-1.49.24-2.02.66-.54.43-.84 1-.84 1.6v5.62c0 .6.3 1.17.84 1.6.53.41 1.26.65 2.02.65h8.57c.76 0 1.48-.24 2.02-.66.53-.42.84-1 .84-1.59v-5.63c0-.6-.3-1.16-.84-1.59a3.29 3.29 0 0 0-2.02-.65Z"
        fill={color || Color.primaryGray}
      />
    </svg>
  );
}

export const LockIcon = memo(_LockIcon);
