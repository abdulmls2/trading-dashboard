import React, { useEffect, useState } from 'react';
import { Menu, X, ChevronLeft, ChevronRight, LogOut, Settings, User, BarChart2, Calendar, PlusCircle, Shield, Home, BookOpen, MessageSquare, Rocket, Plus, CreditCard, Edit, Trash } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userFullName, setUserFullName] = useState('');
  const location = useLocation(); // Hook to get current path
  const { accounts, currentAccount, setCurrentAccount, createAccount, updateAccount, deleteAccount, isLoading } = useAccount();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountFormData, setAccountFormData] = useState({ name: '', description: '', isDefault: false });
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(data?.role === 'admin');
      setUserFullName(data?.full_name || '');
    }

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const handleAccountChange = (account: any) => {
    setCurrentAccount(account);
    setIsAccountMenuOpen(false);
  };

  const handleAccountFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updateAccount(editingAccount, accountFormData);
      } else {
        await createAccount(accountFormData.name, accountFormData.description, accountFormData.isDefault);
      }
      setShowAccountForm(false);
      setEditingAccount(null);
      setAccountFormData({ name: '', description: '', isDefault: false });
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account.id);
    setAccountFormData({
      name: account.name,
      description: account.description || '',
      isDefault: account.is_default
    });
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account? All associated trades will remain but will not be associated with an account.')) {
      try {
        await deleteAccount(id);
      } catch (error) {
        console.error('Error deleting account:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete account');
      }
    }
  };

  const navItems = [
    { path: '/performance', icon: Rocket, label: 'Performance Overview' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/log-trade', icon: PlusCircle, label: 'Log Trade' },
    { path: '/trades-analysis', icon: BarChart2, label: 'Trades Analysis' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/pip', icon: MessageSquare, label: 'Chat with PIP' },
  ];

  const adminItem = { path: '/admin', icon: Shield, label: 'Admin Dashboard' };

  // Define the logo SVG paths
  const logoPaths = {
    blackPart: [
      <path key="p1" d="M134.894 77.6572C132.516 79.2554 129.684 80.0545 126.361 80.0545C123.438 80.0545 120.878 79.3644 118.682 77.9659C116.485 76.5675 114.796 74.6061 113.598 72.0454C112.4 69.5028 111.801 66.5426 111.801 63.1646C111.801 59.7866 112.4 56.6447 113.598 54.1203C114.796 51.5959 116.485 49.6527 118.682 48.2724C120.878 46.8922 123.438 46.2202 126.361 46.2202C129.647 46.2202 132.425 47.0011 134.695 48.5812C136.982 50.1612 138.544 52.3587 139.379 55.1918H148.348C147.821 51.6867 146.55 48.672 144.553 46.1112C142.556 43.5687 140.032 41.5891 136.982 40.1544C133.932 38.7378 130.464 38.0295 126.616 38.0295C121.913 38.0295 117.774 39.0647 114.197 41.1532C110.603 43.2418 107.825 46.1657 105.864 49.9251C103.885 53.6844 102.905 58.0976 102.905 63.1464C102.905 68.1952 103.867 72.6629 105.791 76.4041C107.716 80.1453 110.421 83.0511 113.907 85.1033C117.393 87.1555 121.496 88.1907 126.234 88.1907C130.083 88.1907 133.569 87.4824 136.692 86.0658C139.814 84.6493 142.411 82.6515 144.462 80.0908C146.514 77.5119 147.857 74.5516 148.475 71.1918H139.633C138.834 73.8978 137.255 76.0409 134.876 77.639L134.894 77.6572Z" fill="#1A1C1E"/>,
      <path key="p2" d="M179.284 55.8456C176.652 54.3746 173.62 53.6481 170.207 53.6481C166.793 53.6481 163.834 54.3746 161.165 55.8456C158.515 57.3167 156.427 59.3326 154.92 61.9296C153.413 64.5267 152.668 67.5233 152.668 70.9376C152.668 74.3519 153.431 77.3485 154.92 79.9455C156.427 82.5426 158.515 84.5585 161.165 86.0295C163.816 87.5006 166.83 88.227 170.207 88.227C173.583 88.227 176.634 87.5006 179.284 86.0295C181.917 84.5585 183.986 82.5426 185.493 79.9455C187 77.3485 187.745 74.3519 187.745 70.9376C187.745 67.5233 186.982 64.5267 185.493 61.9296C183.986 59.3326 181.917 57.3167 179.284 55.8456ZM178.467 76.1862C177.668 77.6935 176.561 78.874 175.145 79.7094C173.729 80.5448 172.095 80.9807 170.225 80.9807C168.355 80.9807 166.739 80.563 165.341 79.7094C163.943 78.874 162.835 77.6935 162.018 76.1862C161.202 74.6788 160.784 72.9353 160.784 70.9376C160.784 68.9398 161.202 67.1419 162.018 65.6527C162.835 64.1635 163.943 63.0011 165.341 62.1657C166.739 61.3303 168.373 60.8944 170.225 60.8944C172.077 60.8944 173.729 61.3121 175.145 62.1657C176.561 63.0011 177.668 64.1635 178.467 65.6527C179.266 67.1419 179.666 68.9035 179.666 70.9376C179.666 72.9716 179.266 74.6788 178.467 76.1862Z" fill="#1A1C1E"/>,
      <path key="p3" d="M232.352 53.5936C229.466 53.5936 227.033 54.3564 225.018 55.8456C223.565 56.9353 222.512 58.2792 221.859 59.8774C221.114 58.2792 220.098 56.9353 218.772 55.8456C216.938 54.3383 214.578 53.5936 211.692 53.5936C209.041 53.5936 206.826 54.2111 205.047 55.4279C203.721 56.336 202.705 57.3712 201.997 58.4972L201.325 54.5925H193.881V87.4279H201.997V68.8127C201.997 67.0329 202.305 65.5619 202.923 64.3995C203.54 63.2191 204.393 62.3655 205.446 61.8025C206.499 61.2395 207.679 60.9671 208.968 60.9671C210.875 60.9671 212.4 61.5664 213.562 62.765C214.705 63.9637 215.286 65.7072 215.286 68.0136V87.4279H223.402V68.8127C223.402 66.9966 223.71 65.5074 224.328 64.3632C224.945 63.2191 225.78 62.3473 226.815 61.7662C227.85 61.185 228.994 60.8944 230.246 60.8944C232.189 60.8944 233.75 61.5119 234.93 62.7287C236.111 63.9455 236.692 65.7253 236.692 68.0863V87.4279H244.734V65.9614C244.734 62.202 243.663 59.1873 241.539 56.9535C239.415 54.7196 236.365 53.5936 232.371 53.5936H232.352Z" fill="#1A1C1E"/>,
      <path key="p4" d="M272.657 80.3814C271.223 81.2168 269.389 81.6527 267.174 81.6527C264.161 81.6527 261.891 80.7446 260.366 78.9285C259.15 77.4938 258.442 75.4779 258.187 72.9353L282.861 72.8808V70.4291C282.861 66.9784 282.207 64 280.9 61.5301C279.593 59.042 277.741 57.1169 275.344 55.7185C272.948 54.3201 270.097 53.63 266.775 53.63C263.453 53.63 260.747 54.3746 258.26 55.8638C255.773 57.353 253.848 59.4052 252.487 62.0204C251.107 64.6356 250.435 67.6504 250.435 71.0647C250.435 74.479 251.143 77.4211 252.559 80C253.975 82.597 255.936 84.6311 258.442 86.1203C260.947 87.6095 263.816 88.3541 267.047 88.3541C271.35 88.3541 274.89 87.3371 277.705 85.3031C280.519 83.269 282.28 80.454 282.988 76.8581H275.471C275.036 78.4018 274.092 79.6005 272.639 80.454L272.657 80.3814ZM262.018 61.4393C263.325 60.6402 264.923 60.2406 266.829 60.2406C269.262 60.2406 271.205 60.9308 272.639 62.2928C274.073 63.6731 274.8 65.4892 274.8 67.7412H258.296C258.46 66.7423 258.714 65.8343 259.059 65.017C259.731 63.4188 260.711 62.2202 262.018 61.4211V61.4393Z" fill="#1A1C1E"/>,
      <path key="p5" d="M298.728 38.8286H290.232V87.4279H319.008V79.5823H298.728V38.8286Z" fill="#1A1C1E"/>,
      <path key="p6" d="M344.081 80.3814C342.646 81.2168 340.813 81.6527 338.598 81.6527C335.584 81.6527 333.314 80.7446 331.789 78.9285C330.573 77.4938 329.865 75.4779 329.611 72.9353L354.284 72.8808V70.4291C354.284 66.9784 353.63 64 352.323 61.5301C351.016 59.042 349.164 57.1169 346.768 55.7185C344.371 54.3201 341.521 53.63 338.198 53.63C334.876 53.63 332.171 54.3746 329.683 55.8638C327.196 57.353 325.272 59.4052 323.91 62.0204C322.53 64.6356 321.858 67.6504 321.858 71.0647C321.858 74.479 322.566 77.4211 323.983 80C325.399 82.597 327.359 84.6311 329.865 86.1203C332.37 87.6095 335.239 88.3541 338.471 88.3541C342.773 88.3541 346.314 87.3371 349.128 85.3031C351.942 83.269 353.703 80.454 354.411 76.8581H346.895C346.459 78.4018 345.515 79.6005 344.062 80.454L344.081 80.3814ZM333.46 61.4393C334.767 60.6402 336.365 60.2406 338.271 60.2406C340.704 60.2406 342.646 60.9308 344.081 62.2928C345.515 63.6731 346.241 65.4892 346.241 67.7412H329.738C329.901 66.7423 330.155 65.8343 330.5 65.017C331.172 63.4188 332.152 62.2202 333.46 61.4211V61.4393Z" fill="#1A1C1E"/>,
      <path key="p7" d="M381.934 55.1555C379.81 54.1203 377.269 53.5936 374.291 53.5936C371.314 53.5936 368.79 54.084 366.557 55.0647C364.324 56.0454 362.599 57.4075 361.383 59.151C360.166 60.8944 359.549 62.9648 359.549 65.3621H366.466C366.466 63.6368 367.102 62.2928 368.391 61.3485C369.68 60.4041 371.513 59.9137 373.91 59.9137C375.29 59.9137 376.488 60.1317 377.505 60.5494C378.521 60.9671 379.302 61.639 379.865 62.5471C380.409 63.4552 380.7 64.672 380.7 66.1793V66.9058L370.86 67.7049C366.956 68.0136 363.961 69.067 361.855 70.8649C359.749 72.6629 358.696 75.0602 358.696 78.0749C358.696 81.0897 359.712 83.5959 361.728 85.4847C363.743 87.3734 366.484 88.3178 369.934 88.3178C372.512 88.3178 374.799 87.7911 376.815 86.7196C378.83 85.6481 380.192 84.286 380.9 82.597L381.499 87.4461H388.616V67.5051C388.616 64.454 388.035 61.8933 386.891 59.8229C385.747 57.7707 384.095 56.2089 381.971 55.1737L381.934 55.1555ZM380.736 74.1339C380.736 76.6583 379.992 78.6379 378.503 80.0545C377.014 81.4711 375.017 82.1793 372.494 82.1793C370.714 82.1793 369.353 81.798 368.372 81.0533C367.392 80.3087 366.92 79.2009 366.92 77.7298C366.92 76.4041 367.447 75.3326 368.518 74.5153C369.589 73.6981 371.368 73.1714 373.892 72.9535L380.736 72.4268V74.1521V74.1339Z" fill="#1A1C1E"/>,
      <path key="p8" d="M413.234 54.0658C410.62 54.0658 408.496 54.756 406.862 56.118C405.736 57.0624 404.919 58.2066 404.356 59.5323L403.884 54.647H396.241V87.4098H404.338V71.4642C404.338 68.2679 405.173 65.8888 406.862 64.3269C408.55 62.7469 410.874 61.9659 413.833 61.9659H416.829V54.4472C416.157 54.2656 415.54 54.1566 414.977 54.1203C414.396 54.084 413.833 54.0477 413.252 54.0477L413.234 54.0658Z" fill="#1A1C1E"/>,
      <path key="p9" d="M440.667 53.5936C438.452 53.5936 436.401 54.0658 434.512 54.9921C432.624 55.9183 431.172 57.2077 430.155 58.8422L429.483 54.5925H421.967V87.4279H430.082V69.7389C430.082 67.0874 430.791 64.9444 432.207 63.3644C433.623 61.7662 435.602 60.9671 438.125 60.9671C440.25 60.9671 441.938 61.639 443.173 63.0011C444.407 64.3451 445.024 66.3973 445.024 69.1578V87.4279H453.14V67.2145C453.14 63.0011 452.087 59.6776 449.981 57.244C447.875 54.8104 444.77 53.5936 440.649 53.5936H440.667Z" fill="#1A1C1E"/>,
      <path key="p10" d="M462 38.8286V87.4279H470.496V67.5596H488.579V59.9137H470.496V46.6742H492.029V38.8286H462Z" fill="#1A1C1E"/>,
      <path key="p11" d="M520.315 55.8456C517.682 54.3746 514.65 53.6481 511.237 53.6481C507.824 53.6481 504.864 54.3746 502.196 55.8456C499.527 57.3167 497.457 59.3326 495.95 61.9296C494.443 64.5267 493.699 67.5233 493.699 70.9376C493.699 74.3519 494.443 77.3485 495.95 79.9455C497.457 82.5426 499.545 84.5585 502.196 86.0295C504.846 87.5006 507.86 88.227 511.237 88.227C514.614 88.227 517.664 87.5006 520.315 86.0295C522.947 84.5585 525.017 82.5426 526.524 79.9455C528.031 77.3485 528.775 74.3519 528.775 70.9376C528.775 67.5233 528.013 64.5267 526.524 61.9296C525.017 59.3326 522.947 57.3167 520.315 55.8456ZM519.48 76.1862C518.681 77.6935 517.573 78.874 516.157 79.7094C514.741 80.5448 513.107 80.9807 511.237 80.9807C509.367 80.9807 507.751 80.563 506.353 79.7094C504.955 78.874 503.848 77.6935 503.031 76.1862C502.214 74.6788 501.796 72.9353 501.796 70.9376C501.796 68.9398 502.214 67.1419 503.031 65.6527C503.848 64.1635 504.955 63.0011 506.353 62.1657C507.751 61.3303 509.385 60.8944 511.237 60.8944C513.089 60.8944 514.741 61.3121 516.157 62.1657C517.573 63.0011 518.681 64.1635 519.48 65.6527C520.278 67.1419 520.678 68.9035 520.678 70.9376C520.678 72.9716 520.278 74.6788 519.48 76.1862Z" fill="#1A1C1E"/>,
      <path key="p12" d="M551.905 54.0658C549.291 54.0658 547.166 54.756 545.532 56.118C544.407 57.0624 543.59 58.2066 543.027 59.5323L542.555 54.647H534.912V87.4098H543.027V71.4642C543.027 68.2679 543.862 65.8888 545.551 64.3269C547.239 62.7469 549.563 61.9659 552.522 61.9659H555.518V54.4472C554.846 54.2656 554.229 54.1566 553.666 54.1203C553.085 54.084 552.522 54.0477 551.941 54.0477L551.905 54.0658Z" fill="#1A1C1E"/>,
      <path key="p13" d="M579.846 80.3814C578.412 81.2168 576.578 81.6527 574.363 81.6527C571.349 81.6527 569.08 80.7446 567.555 78.9285C566.339 77.4938 565.63 75.4779 565.376 72.9353L590.049 72.8808V70.4291C590.049 66.9784 589.396 64 588.089 61.5301C586.781 59.042 584.93 57.1169 582.533 55.7185C580.137 54.3201 577.286 53.63 573.964 53.63C570.641 53.63 567.936 54.3746 565.449 55.8638C562.962 57.353 561.037 59.4052 559.675 62.0204C558.296 64.6356 557.624 67.6504 557.624 71.0647C557.624 74.479 558.332 77.4211 559.748 80C561.164 82.597 563.125 84.6311 565.63 86.1203C568.136 87.6095 571.004 88.3541 574.236 88.3541C578.539 88.3541 582.079 87.3371 584.893 85.3031C587.707 83.269 589.468 80.454 590.177 76.8581H582.66C582.224 78.4018 581.28 79.6005 579.828 80.454L579.846 80.3814ZM569.207 61.4393C570.514 60.6402 572.112 60.2406 574.018 60.2406C576.451 60.2406 578.394 60.9308 579.828 62.2928C581.262 63.6731 581.988 65.4892 581.988 67.7412H565.485C565.649 66.7423 565.903 65.8343 566.248 65.017C566.92 63.4188 567.9 62.2202 569.207 61.4211V61.4393Z" fill="#1A1C1E"/>,
      <path key="p14" d="M624 54.5925H614.904L607.914 65.7616L600.688 54.5925H591.248L602.54 71.3371L591.248 87.4279H600.489L607.333 76.5857L614.36 87.4279H623.673L612.834 71.2826L624 54.5925Z" fill="#1A1C1E"/>,
    ],
    bluePart: <path key="p15" d="M79.5568 45.4938H47.2947V34.3428C51.6157 34.7968 55.8096 36.2134 59.4951 38.4291L60.2758 38.9012L67.6651 26.6425L66.8844 26.1703C60.9839 22.6107 54.2301 20.4676 47.2947 19.9773V0H32.9883V21.2849C30.9186 21.8297 28.9033 22.5199 26.9426 23.3371C21.6957 25.5528 16.9753 28.7491 12.9266 32.7991C8.87797 36.849 5.70079 41.5709 3.46768 46.8195C1.16194 52.2679 0 58.0431 0 64C0 69.9569 1.16194 75.7321 3.46768 81.1805C5.68263 86.4291 8.87797 91.151 12.9266 95.2009C16.9753 99.2508 21.6957 102.429 26.9426 104.663C28.9033 105.498 30.9186 106.17 32.9883 106.715V128H47.2947V108.005C54.2119 107.514 60.9657 105.371 66.8844 101.812L67.6651 101.339L60.2758 89.0806L59.4951 89.5528C55.8096 91.7866 51.6157 93.185 47.2947 93.639V82.4881H79.5568V68.1771H32.9883V91.6776C29.2665 90.1884 25.9259 87.9728 23.0392 85.0851C17.411 79.4552 14.3064 71.9728 14.3064 64C14.3064 56.0272 17.411 48.5448 23.0392 42.9149C25.9259 40.0272 29.2665 37.8116 32.9883 36.3224V59.8229H79.5568V45.4938Z" fill="#5454FF"/>,
  };

  return (
    <aside className={`relative bg-white shadow-md h-screen flex flex-col transition-width duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo Area */}
      <div className={`flex items-center h-16 border-b ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Link to="/performance" className={`flex items-center overflow-hidden ${isCollapsed ? 'w-full justify-center' : ''}`}>
          <svg 
             height={isCollapsed ? "30" : "40"} 
             viewBox={isCollapsed ? "0 0 80 128" : "0 0 624 128"}
             preserveAspectRatio="xMidYMid meet" 
             fill="none" 
             xmlns="http://www.w3.org/2000/svg"
             className={`transition-all duration-300 ${isCollapsed ? 'w-8' : 'w-[180px]'}`}
          >
             {isCollapsed ? (
                logoPaths.bluePart
             ) : (
                <>
                   {logoPaths.blackPart}
                   {logoPaths.bluePart}
                </>
             )}
          </svg>
        </Link>
        {/* Collapse Toggle Button - Moved here */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        )}
         {isCollapsed && (
           <button
             onClick={() => setIsCollapsed(false)}
             className="absolute top-4 right-0 transform translate-x-1/2 p-1 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             aria-label="Expand sidebar"
             style={{ marginTop: '0'}} // Ensure it aligns with the logo area if needed
           >
             <ChevronRight size={18} />
           </button>
         )}
      </div>

      {/* Account Selector */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-b">
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium text-gray-500">ACCOUNT</p>
            <button 
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)} 
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Change
            </button>
          </div>
          
          {currentAccount && (
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-sm truncate">{currentAccount.name}</p>
                {currentAccount.is_default && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap">Default</span>
                )}
              </div>
            </div>
          )}
          
          {isAccountMenuOpen && (
            <div className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {accounts.map(account => (
                  <div key={account.id} className="px-4 py-2 hover:bg-gray-100 flex justify-between items-center">
                    <button 
                      onClick={() => handleAccountChange(account)}
                      className="text-sm text-left w-full"
                    >
                      <span className={`${currentAccount?.id === account.id ? 'font-bold' : ''}`}>
                        {account.name}
                        {account.is_default && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Default</span>
                        )}
                      </span>
                    </button>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleEditAccount(account)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Edit size={14} />
                      </button>
                      {!account.is_default && (
                        <button 
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    setAccountFormData({ name: '', description: '', isDefault: false });
                    setEditingAccount(null);
                    setShowAccountForm(true);
                    setIsAccountMenuOpen(false);
                  }}
                  className="px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 w-full text-left flex items-center"
                >
                  <Plus size={14} className="mr-2" />
                  Add new account
                </button>
              </div>
            </div>
          )}
          
          {showAccountForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-medium mb-4">{editingAccount ? 'Edit Account' : 'Create New Account'}</h3>
                <form onSubmit={handleAccountFormSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input 
                      type="text" 
                      value={accountFormData.name} 
                      onChange={(e) => setAccountFormData({...accountFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      value={accountFormData.description} 
                      onChange={(e) => setAccountFormData({...accountFormData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="mb-4 flex items-center">
                    <input 
                      type="checkbox" 
                      id="is-default" 
                      checked={accountFormData.isDefault} 
                      onChange={(e) => setAccountFormData({...accountFormData, isDefault: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is-default" className="ml-2 block text-sm text-gray-700">
                      Set as default account
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAccountForm(false);
                        setEditingAccount(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {editingAccount ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-grow mt-4 space-y-1 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium group transition-colors duration-150 ease-in-out
              ${isActive(item.path)
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              ${isCollapsed ? 'justify-center' : ''}`}
             title={isCollapsed ? item.label : ''} // Tooltip for collapsed state
          >
            <item.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${isActive(item.path) ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
        ))}
        {isAdmin && (
          <Link
            to={adminItem.path}
            className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium group transition-colors duration-150 ease-in-out
              ${isActive(adminItem.path)
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'}
              ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? adminItem.label : ''}
          >
            <adminItem.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${isActive(adminItem.path) ? 'text-indigo-600' : 'text-indigo-500 group-hover:text-indigo-600'}`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">{adminItem.label}</span>}
          </Link>
        )}
      </nav>

      {/* Footer Area (User Info & Logout) */}
      <div className="border-t mt-auto">
         {user && !isCollapsed && (
           <div className="px-4 py-3 text-sm text-gray-700 border-b">
             Welcome, <span className="font-medium">{userFullName || user.email}</span>
           </div>
         )}
        <div className={`px-2 py-2 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
           <Link
            to="/profile"
            className={`flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium group transition-colors duration-150 ease-in-out
              ${isActive('/profile')
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              ${isCollapsed ? 'justify-center' : ''}`}
             title={isCollapsed ? 'Profile Settings' : ''}
          >
             <Settings className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} text-gray-400 group-hover:text-gray-500`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Profile Settings</span>}
           </Link>

          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium group transition-colors duration-150 ease-in-out text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} text-gray-400 group-hover:text-gray-500`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
} 