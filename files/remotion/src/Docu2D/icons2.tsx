// Icônes supplémentaires Docu2D (repère 100×100 centré, aplats papier) — s'ajoutent à IC (icons.tsx).
import React from "react";
import { IC } from "./icons";
const I = (d: React.ReactNode) => <g>{d}</g>;
export const IC2: Record<string, React.ReactNode> = {
  ...IC,
  skull: I(<><path d="M-30,-4 Q-32,-38 0,-38 Q32,-38 30,-4 Q30,12 18,16 L18,30 L-18,30 L-18,16 Q-30,12 -30,-4 Z" fill="#fbf8f1" /><circle cx={-12} cy={-6} r={9} fill="#1d2a30" /><circle cx={12} cy={-6} r={9} fill="#1d2a30" /><path d="M-4,10 L0,4 L4,10 Z" fill="#1d2a30" /><path d="M-10,22 L-10,30 M0,22 L0,30 M10,22 L10,30" stroke="#1d2a30" strokeWidth={3} /></>),
  tooth: I(<path d="M-10,36 Q-14,0 -24,-14 Q-30,-30 -16,-36 Q-6,-38 0,-30 Q6,-38 16,-36 Q30,-30 24,-14 Q14,0 10,36 Q4,40 0,24 Q-4,40 -10,36 Z" fill="#f3ead2" stroke="#cdbf9c" strokeWidth={3} />),
  tusk: I(<path d="M-30,34 Q-26,-10 10,-34 Q20,-38 22,-30 Q-4,-6 -14,34 Z" fill="#f3ead2" stroke="#cdbf9c" strokeWidth={3} />),
  snake: I(<path d="M-36,24 Q-20,40 -6,24 Q8,8 22,22 Q34,34 38,18 M-36,24 Q-44,10 -30,4 Q-14,0 -12,-14 Q-10,-30 8,-30 L20,-30" stroke="#5d8a3a" strokeWidth={10} fill="none" strokeLinecap="round" />),
  sun: I(<><circle r={20} fill="#f2c14e" />{Array.from({ length: 8 }, (_, i) => <path key={i} d="M0,-28 L0,-40" stroke="#f2c14e" strokeWidth={6} strokeLinecap="round" transform={`rotate(${i * 45})`} />)}</>),
  moon: I(<path d="M10,-34 A34,34 0 1 0 30,20 A26,26 0 1 1 10,-34 Z" fill="#f1ecd2" />),
  whale: I(<><path d="M-40,6 Q-36,-22 0,-22 Q30,-22 36,0 Q30,16 0,18 Q-24,20 -40,6 Z" fill="#5a7f9a" /><path d="M36,0 L46,-14 L44,8 Z" fill="#5a7f9a" /><circle cx={-24} cy={-4} r={3} fill="#1d2a30" /><path d="M-6,-24 Q-4,-38 2,-40 M-6,-24 Q-12,-36 -18,-36" stroke="#9fd0e0" strokeWidth={4} fill="none" /></>),
  weight: I(<><path d="M-30,34 L-22,-14 L22,-14 L30,34 Z" fill="#2b3a42" /><circle cy={-24} r={10} fill="none" stroke="#2b3a42" strokeWidth={6} /><text y={20} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={22} fill="#fff">t</text></>),
  speed: I(<><path d="M-36,16 A38,38 0 1 1 36,16" stroke="#2b3a42" strokeWidth={8} fill="none" /><path d="M0,10 L22,-18" stroke="#e5533d" strokeWidth={7} strokeLinecap="round" /><circle cy={10} r={7} fill="#2b3a42" /></>),
  canoe: I(<><path d="M-44,0 Q0,26 44,0 L40,-6 L-40,-6 Z" fill="#c0562e" /><path d="M10,-40 L-6,20" stroke="#8a6034" strokeWidth={5} strokeLinecap="round" /></>),
  baby: I(<><circle cy={-12} r={20} fill="#e2ad84" /><circle cx={-7} cy={-14} r={3} fill="#1d2a30" /><circle cx={7} cy={-14} r={3} fill="#1d2a30" /><path d="M-24,36 Q-24,12 0,12 Q24,12 24,36 Z" fill="#9fd0e0" /></>),
  warning: I(<><path d="M0,-38 L40,32 L-40,32 Z" fill="#f2c14e" /><path d="M0,-14 L0,10" stroke="#1d2a30" strokeWidth={8} strokeLinecap="round" /><circle cy={22} r={5} fill="#1d2a30" /></>),
  grass: I(<>{[-24, -12, 0, 12, 24].map((x, i) => <path key={i} d={`M${x},34 Q${x - 6},0 ${x + (i % 2 ? 8 : -8)},-30`} stroke="#6f9a3a" strokeWidth={6} fill="none" strokeLinecap="round" />)}</>),
  bacteria: I(<><ellipse rx={30} ry={14} fill="#8fbf6a" transform="rotate(-20)" /><ellipse cx={-6} cy={0} rx={6} ry={4} fill="#5d8a3a" /><path d="M24,-14 q10,-6 16,2 M-26,14 q-10,6 -16,-2" stroke="#8fbf6a" strokeWidth={3} fill="none" /></>),
  ruler: I(<><rect x={-40} y={-12} width={80} height={24} rx={3} fill="#f2c14e" />{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${-32 + i * 8},-12 l0,${i % 2 ? 8 : 14}`} stroke="#1d2a30" strokeWidth={2} />)}</>),
  hippo: I(<><path d="M-36,10 Q-38,-16 -14,-22 L14,-24 Q34,-26 38,-8 Q42,8 30,14 Q10,20 -10,18 Q-30,20 -36,10 Z" fill="#8c7c88" /><circle cx={-18} cy={-26} r={6} fill="#8c7c88" /><circle cx={-4} cy={-28} r={7} fill="#8c7c88" /><circle cx={-4} cy={-28} r={3} fill="#1d1a18" /><ellipse cx={30} cy={-12} rx={3} ry={2} fill="#3b2f3a" /><path d="M20,12 L22,26 L26,12 Z" fill="#f3ead2" /></>),
  lion: I(<><circle r={30} fill="#8a5527" /><circle r={20} fill="#d9a55a" /><circle cx={-7} cy={-4} r={3} fill="#1d1a18" /><circle cx={7} cy={-4} r={3} fill="#1d1a18" /><path d="M-5,8 L5,8 L0,13 Z" fill="#5a3a1e" /></>),
  crocodile: I(<><path d="M-44,6 L36,-4 L44,4 L36,10 L-44,12 Z" fill="#5d6b3e" /><path d="M-20,-2 L-16,-10 L-12,-2 M-4,-4 L0,-12 L4,-4" fill="#47532f" /></>),
  money: I(<><rect x={-36} y={-20} width={72} height={40} rx={6} fill="#6f9a5a" /><circle r={12} fill="#a9cf8f" /><text y={6} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={16} fill="#2f4a26">$</text></>),
  colombia: I(<><path d="M-20,-34 L14,-30 L26,-6 L18,26 L-4,34 L-14,10 L-30,-6 Z" fill="#f2c14e" /><path d="M-30,-6 L-14,10 L-4,34" stroke="#2f5f9a" strokeWidth={6} fill="none" /></>),
  pig: I(<><ellipse rx={34} ry={24} fill="#f2a7b0" /><circle cx={30} cy={-4} r={13} fill="#f2a7b0" /><ellipse cx={40} cy={-2} rx={6} ry={7} fill="#e58a96" /><circle cx={28} cy={-12} r={3} fill="#1d2a30" /><path d="M20,-22 L26,-34 L30,-20 Z" fill="#e58a96" /><path d="M-20,22 L-20,34 M14,22 L14,34" stroke="#e58a96" strokeWidth={7} strokeLinecap="round" /><path d="M-34,-4 q-10,-6 -6,-14" stroke="#e58a96" strokeWidth={4} fill="none" /></>),
  elephant: I(<><ellipse cx={-6} cy={2} rx={30} ry={22} fill="#9a9590" /><circle cx={22} cy={-10} r={16} fill="#9a9590" /><path d="M32,-4 Q42,14 34,32" stroke="#9a9590" strokeWidth={9} fill="none" strokeLinecap="round" /><path d="M10,-22 Q-6,-14 4,6 Q14,4 18,-8 Z" fill="#7c7772" /><path d="M-26,20 L-26,36 M8,20 L8,36" stroke="#9a9590" strokeWidth={9} strokeLinecap="round" /><circle cx={26} cy={-14} r={2.5} fill="#1d2a30" /></>),
  thermometer: I(<><rect x={-7} y={-36} width={14} height={50} rx={7} fill="#fbf8f1" /><circle cy={22} r={13} fill="#e5533d" /><rect x={-3} y={-10} width={6} height={30} fill="#e5533d" /></>),
};
export const icon = (name?: string) => (name && IC2[name]) || IC2.question;
