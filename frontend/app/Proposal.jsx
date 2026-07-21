import { useNavigation } from 'expo-router';
import ProposalScreen from '../screens/ProposalScreen';

export default function Proposal() {
  const navigation = useNavigation();
  return <ProposalScreen navigation={navigation} />;
}
