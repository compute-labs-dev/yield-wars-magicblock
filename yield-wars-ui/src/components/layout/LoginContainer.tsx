import { PrivyLogin } from "../privy/PrivyLogin";
import ProfileContainer from "../privy/ProfileContainer";
import ProfileIcon from "../privy/ProfileIcon";
import { usePrivy } from "@privy-io/react-auth";

export default function LoginContainer() {
    const { user } = usePrivy();
    return (
        <div>
            {!user && <PrivyLogin />}
            {user && <ProfileIcon />}
            <ProfileContainer />
        </div>
    )
}