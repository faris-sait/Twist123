import { useState } from 'react';

export function TwistLogo({ className = "w-10 h-10" }) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = () => {
    setIsSpinning(true);
    setTimeout(() => {
      setIsSpinning(false);
    }, 5000);
  };

  return (
    <div 
      className={`${className} logo-tilt-container ${isSpinning ? 'spinning' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <svg viewBox="28 87 157 153" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0.31" style={{stopColor:"#f9b512"}}/>
            <stop offset="1" style={{stopColor:"#855f04", stopOpacity:0.84}}/>
          </linearGradient>
          <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{stopColor:"#fabe0d"}}/>
            <stop offset="100%" style={{stopColor:"#b07c05", stopOpacity:0}}/>
          </linearGradient>
          <linearGradient id="goldGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0.11" style={{stopColor:"#b07c05"}}/>
            <stop offset="0.42" style={{stopColor:"#b07c05", stopOpacity:0}}/>
          </linearGradient>
        </defs>
        <g transform="translate(4.23, 0)">
          <path d="m 102.506,87.175 a 73.983,76.033 0 0 0 -73.983,76.033 73.983,76.033 0 0 0 73.983,76.033 73.983,76.033 0 0 0 73.983,-76.033 73.983,76.033 0 0 0 -73.983,-76.033 z m 0,4.635 a 69.526,71.754 0 0 1 69.526,71.754 69.526,71.754 0 0 1 -69.526,71.754 69.526,71.754 0 0 1 -69.526,-71.754 69.526,71.754 0 0 1 69.526,-71.754 z" fill="url(#goldGrad)"/>
          <path d="m 110.359,151.417 c -1.693,0.801 -3.307,1.769 -4.812,2.885 -4.316,3.202 -7.689,7.627 -9.776,12.579 -2.086,4.952 -2.896,10.417 -2.490,15.776 0.247,3.256 0.942,6.493 2.240,9.489 1.298,2.996 3.211,5.747 5.701,7.859 2.574,2.183 5.746,3.654 9.076,4.207" fill="url(#goldGrad2)"/>
          <path d="m 96.489,145.202 c -8.349,0.208 16.698,-0.416 25.047,-0.624" fill="#ece807"/>
          <path d="m 95.889,144.829 0.075,21.000 c 2.192,-8.499 11.633,-19.556 24.896,-20.920 z" fill="#f8c811"/>
          <path d="m 96.570,153.663 9.013,-8.603" fill="#ece807"/>
          <path d="m 95.928,154.052 c 1.240,-3.033 4.927,-7.564 9.259,-9.191 l 15.531,0.063 c -16.506,2.093 -23.795,16.456 -24.755,20.905 z" fill="url(#goldGrad3)"/>
          <path d="m 68.593,151.143 1.159,-1.655 a 16.952,16.952 143.082 0 1 8.407,-6.317 l 0.908,-0.310 a 30.743,30.743 170.529 0 1 9.882,-1.649 l 30.467,-0.050 a 22.168,22.168 167.026 0 0 9.631,-2.219 23.039,23.039 141.702 0 0 7.344,-5.799 24.010,24.010 115.064 0 0 3.771,-8.064 l 0,0 -48.092,-0.210 a 23.948,23.948 169.600 0 0 -8.706,1.598 l -1.689,0.650 c -1.826,0.703 -4.453,2.370 -5.836,3.754 -1.275,1.277 -2.123,2.198 -2.835,3.132 -1.179,1.548 -2.541,4.421 -3.103,6.285 -0.245,0.813 -0.476,1.680 -0.715,2.644 -0.609,2.459 -0.845,6.140 -0.593,8.207 z" fill="#fac10e"/>
        </g>
      </svg>
      <style jsx>{`
        .logo-tilt-container {
          display: inline-block;
          perspective: 1000px;
          transform-style: preserve-3d;
          transition: all 0.3s ease;
        }
        
        .logo-tilt-container:hover {
          transform: scale(1.05);
        }
        
        .logo-tilt-container svg {
          animation: coinFlip 4s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        
        .logo-tilt-container.spinning svg {
          animation: fastSpin 5s linear;
        }
        
        @keyframes coinFlip {
          0% {
            transform: rotateY(0deg);
          }
          25% {
            transform: rotateY(-90deg);
          }
          50% {
            transform: rotateY(0deg);
          }
          75% {
            transform: rotateY(90deg);
          }
          100% {
            transform: rotateY(0deg);
          }
        }
        
        @keyframes fastSpin {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(-3600deg);
          }
        }
      `}</style>
    </div>
  );
}
