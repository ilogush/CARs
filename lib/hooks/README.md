# Safe Async Hook

## Usage Example

### Before (Memory Leak Risk):
```typescript
useEffect(() => {
  fetchData() // No cleanup!
}, [])
```

### After (Safe):
```typescript
import { useSafeAsync } from '@/lib/hooks/useSafeAsync'

function MyComponent() {
  const [data, setData] = useState(null)
  const { safeFetch, safeSetState } = useSafeAsync()

  useEffect(() => {
    async function loadData() {
      const result = await safeFetch('/api/data')
      if (result) {
        safeSetState(setData, result)
      }
    }
    loadData()
  }, [safeFetch, safeSetState])
}
```

## API

- `safeFetch(url, options)` - Fetch with automatic abort on unmount
- `safeSetState(setter, value)` - Set state only if mounted
- `isMounted()` - Check mount status
- `signal` - AbortSignal for manual use
