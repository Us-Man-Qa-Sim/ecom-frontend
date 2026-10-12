import { countryName } from './countries';

type Props = {
  address: {
    street: string;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  };
};

/** An address as postal lines. Also used for the order's address snapshot. */
export function AddressLines({ address }: Props) {
  return (
    <address className="text-sm not-italic">
      <span className="block">{address.street}</span>
      <span className="block">
        {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
      </span>
      <span className="block">{countryName(address.country)}</span>
    </address>
  );
}
