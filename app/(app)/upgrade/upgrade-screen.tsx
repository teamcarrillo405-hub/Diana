export type UpgradeScreenView = "standard" | "community";

export function UpgradeScreen({
  view: _view,
  billingEnabled: _billingEnabled,
  billingUnavailable: _billingUnavailable = false,
}: {
  view: UpgradeScreenView;
  billingEnabled: boolean;
  billingUnavailable?: boolean;
}) {
  return <div />;
}
