import { useNavigation } from 'expo-router';
import InvoiceScreen from '../screens/InvoiceScreen';

export default function Invoice() {
  const navigation = useNavigation();
  return <InvoiceScreen navigation={navigation} />;
}
