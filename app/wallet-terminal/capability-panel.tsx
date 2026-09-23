type CapabilityPanelProps = {
  hasMetaMask: boolean;
  isConnected: boolean;
  isArbitrum: boolean;
};

function Capability({
  label,
  detail,
  state,
}: {
  label: string;
  detail: string;
  state: "ready" | "available" | "excluded";
}) {
  return (
    <li>
      <span className={`check-icon ${state === "ready" ? "pass" : ""}`}>
        {state === "ready" ? "✓" : state === "available" ? "·" : "–"}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </li>
  );
}

export function CapabilityPanel({
  hasMetaMask,
  isConnected,
  isArbitrum,
}: CapabilityPanelProps) {
  return (
    <article className="panel">
      <p className="step-label">Reference coverage</p>
      <h2>Capability matrix</h2>
      <ul className="checklist capability-list">
        <Capability
          label="Web3Auth connector"
          detail="Direct MetaMask connector; no modal"
          state={isConnected ? "ready" : "available"}
        />
        <Capability
          label="EIP-1193 provider"
          detail="Accounts, chain events, RPC requests"
          state={hasMetaMask ? "ready" : "available"}
        />
        <Capability
          label="Arbitrum reads"
          detail="Balances, fees, nonce, block, allowance"
          state={isArbitrum ? "ready" : "available"}
        />
        <Capability
          label="EIP-191 and EIP-712"
          detail="Session and typed order signatures"
          state="available"
        />
        <Capability
          label="Transactions"
          detail="Simulate, send, write contract, receipt"
          state="available"
        />
        <Capability
          label="Embedded wallet services"
          detail="Social auth, MFA, and key export excluded by scope"
          state="excluded"
        />
        <Capability
          label="Exchange execution"
          detail="Requires a protocol adapter and backend"
          state="excluded"
        />
      </ul>
    </article>
  );
}
