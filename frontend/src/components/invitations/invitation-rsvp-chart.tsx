'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CHART_COLORS = ['#34d399', '#f87171', '#fbbf24'];

export function InvitationRsvpChart({
  confirmed,
  declined,
  pending,
}: {
  confirmed: number;
  declined: number;
  pending: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={[
            { name: 'Présents', value: confirmed },
            { name: 'Absents', value: declined },
            { name: 'En attente', value: pending },
          ]}
          dataKey="value"
          innerRadius={40}
          outerRadius={70}
        >
          {CHART_COLORS.map((c, i) => (
            <Cell key={i} fill={c} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
