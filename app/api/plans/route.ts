import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
export const runtime = 'nodejs';

const defaults = [
  ['MTN','1GB','₦350',350],['MTN','2GB','₦700',700],['Airtel','1GB','₦350',350],
  ['Airtel','3GB','₦1,000',1000],['Glo','1GB','₦300',300],['9mobile','1GB','₦300',300]
];

export async function GET() {
  await getSql() `CREATE UNIQUE INDEX IF NOT EXISTS idx_data_plans_network_name ON data_plans(network, plan_name)`;
  for (const [network, planName, dataAmount, price] of defaults) {
    await getSql() `INSERT INTO data_plans (network, plan_name, data_amount, price, validity) VALUES (${network}, ${planName}, ${dataAmount}, ${price}, '30 days') ON CONFLICT (network, plan_name) DO NOTHING`;
  }
  const plans = await getSql() `SELECT id, network, plan_name, data_amount, price, validity FROM data_plans WHERE status = 'active' ORDER BY network, price`;
  return NextResponse.json({ plans });
}
