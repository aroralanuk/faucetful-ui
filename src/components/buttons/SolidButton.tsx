import { PropsWithChildren, ReactElement } from 'react';

interface ButtonProps {
  type?: 'submit' | 'reset' | 'button';
  color?: 'white' | 'blue' | 'green' | 'red' | 'gray' | 'yellow' | 'bluish'; // defaults to blue
  bold?: boolean;
  classes?: string;
  icon?: ReactElement;
}

export function SolidButton(
  props: PropsWithChildren<ButtonProps & React.HTMLProps<HTMLButtonElement>>,
) {
  const {
    type,
    onClick,
    color: _color,
    classes,
    bold,
    icon,
    disabled,
    title,
    ...passThruProps
  } = props;
  const color = _color ?? 'blue';

  const base = 'flex items-center justify-center rounded-md transition-all duration-500';
  let baseColors, onHover, onActive;
  if (color === 'yellow') {
    baseColors = 'bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 text-white';
    onHover = 'hover:bg-yellow-700';
    onActive = 'active:bg-blue-700';
  } else if (color === 'bluish') {
    baseColors = 'bg-bluish-500 text-white opacity-70';
    onHover = 'hover:bg-bluish-400 opacity-100';
    onActive = 'active:bg-bluish-700';
  } else if (color === 'blue') {
    baseColors = 'bg-blue-500 text-white';
    onHover = 'hover:bg-blue-600';
    onActive = 'active:bg-blue-700';
  } else if (color === 'green') {
    baseColors = 'bg-green-500 text-white';
    onHover = 'hover:bg-green-600';
    onActive = 'active:bg-green-700';
  } else if (color === 'red') {
    baseColors = 'bg-red-600 text-white';
    onHover = 'hover:bg-red-500';
    onActive = 'active:bg-red-400';
  } else if (color === 'white') {
    baseColors = 'bg-white text-black';
    onHover = 'hover:bg-gray-100';
    onActive = 'active:bg-gray-200';
  } else if (color === 'gray') {
    baseColors = 'bg-gray-100 text-blue-500';
    onHover = 'hover:bg-gray-200';
    onActive = 'active:bg-gray-300';
  }
  const onDisabled = 'disabled:bg-bluish-700 disabled:text-gray-500';
  const weight = bold ? 'font-semibold' : '';
  const allClasses = `${base} ${baseColors} ${onHover} ${onDisabled} ${onActive} ${weight} ${classes}`;

  return (
    <button
      onClick={onClick}
      type={type ?? 'button'}
      disabled={disabled ?? false}
      title={title}
      className={allClasses}
      {...passThruProps}
    >
      {icon ? (
        <div className="flex items-center justify-center space-x-1 btn-gradient">
          {props.icon}
          {props.children}
        </div>
      ) : (
        <>{props.children}</>
      )}
    </button>
  );
}
