# Implementing Admin Impersonation Support for New Pages

When creating new pages in the Trading Dashboard, follow these steps to ensure admins can properly view user data through impersonation:

## 1. Use the `useEffectiveUserId()` Hook for Data Fetching

Always fetch data using the effective user ID instead of the logged-in user's ID:

```tsx
import { useEffectiveUserId } from '../api/useEffectiveUserId';

function YourNewPage() {
  // Get the effective user ID (will be the impersonated user's ID when an admin is impersonating)
  const effectiveUserId = useEffectiveUserId();
  
  useEffect(() => {
    async function fetchData() {
      if (!effectiveUserId) return;
      
      // Log for debugging purposes
      console.log('Fetching data for user:', effectiveUserId);
      
      // Always use effectiveUserId when fetching data, not user.id
      const data = await fetchSomeData(effectiveUserId);
      // ...
    }
    
    fetchData();
  }, [effectiveUserId]);
  
  // Rest of your component...
}
```

## 2. Add the Page to the Section Routes Mapping

In `src/contexts/UserImpersonationContext.tsx`, add your new page to the section routes mapping:

```tsx
// Map of sections to their routes
const sectionRoutes: Record<string, string> = {
  'journal': '/journal',
  'performance': '/performance',
  'calendar': '/calendar',
  'trades-analysis': '/trades-analysis',
  'profile': '/profile',
  'your-new-page': '/your-new-page-route' // Add this line
};
```

## 3. Add a Navigation Button in AdminDashboard.tsx

Add a button in the AdminDashboard component to allow admins to navigate to your new page:

```tsx
<button
  onClick={() => handleViewUserSection('your-new-page', profile)}
  className="text-blue-600 hover:text-blue-900 font-medium flex items-center"
  title="View Your New Page"
>
  <YourIcon className="h-4 w-4 mr-1" />
  Your Page
</button>
```

## 4. Test Impersonation

Always test that your page shows the correct user's data when:
1. Logged in as a normal user
2. Logged in as an admin impersonating a user

Remember that the goal of impersonation is to let admins view exactly what the user would see. 