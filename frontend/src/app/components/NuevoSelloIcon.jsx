import React from 'react';

const NuevoSelloIcon = ({ className, size = 20, ...props }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable="false"
    {...props}
  >
    <path
      fill="#a85ce0"
      d="M512,255.996l-63.305-51.631l29.002-76.362l-80.633-13.07
         L383.993,34.3l-76.361,29.002L256,0.004l-51.646,63.298
         L128.008,34.3l-13.07,80.634l-80.633,13.07l28.988,76.362
         L0,255.996l63.292,51.632l-28.988,76.368l80.633,13.07
         l13.07,80.633l76.347-29.002L256,511.996l51.632-63.299
         l76.361,29.002l13.07-80.633l80.633-13.07l-29.002-76.368
         L512,255.996z"
    />
    <text
      fill="#ffffff"
      x="256"
      y="260"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="88"
      fontWeight="800"
      letterSpacing="2"
      textAnchor="middle"
      dominantBaseline="middle"
      transform="rotate(-11 256 256)"
    >
      NUEVO
    </text>
  </svg>
);

export default NuevoSelloIcon;
