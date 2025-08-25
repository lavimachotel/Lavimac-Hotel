# Debug Guide - SQL.js Webpack Issues

## 🚨 If CRACO Approach Doesn't Work

### **Alternative 1: Use sql.js via CDN**

Replace the import in `DatabaseManager.js`:

```javascript
// Remove this import:
// import initSqlJs from 'sql.js';

// Add this in the initializeSQLjs method:
async initializeSQLjs() {
  try {
    // Load sql.js from CDN
    const initSqlJs = await import('https://sql.js.org/dist/sql-wasm.js');
    
    this.SQL = await initSqlJs.default({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    console.log('📦 SQL.js initialized from CDN');
  } catch (error) {
    console.error('Failed to initialize SQL.js:', error);
    throw error;
  }
}
```

### **Alternative 2: Load sql.js Dynamically**

Create a new file `client/public/sql-loader.js`:

```javascript
// In DatabaseManager.js, replace the import with:
async initializeSQLjs() {
  try {
    // Load sql.js script dynamically
    const script = document.createElement('script');
    script.src = 'https://sql.js.org/dist/sql-wasm.js';
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    
    this.SQL = await window.initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    console.log('📦 SQL.js initialized dynamically');
  } catch (error) {
    console.error('Failed to initialize SQL.js:', error);
    throw error;
  }
}
```

### **Alternative 3: Different SQLite Library**

If sql.js continues to be problematic, we can use `absurd-sql`:

```bash
npm uninstall sql.js
npm install @journeyapps/sqlcipher
```

## 🔍 **Debugging Steps:**

### **1. Check Browser Console**
- Open DevTools (F12)
- Go to Console tab
- Look for specific error messages

### **2. Check Network Tab**
- See if sql.js files are loading from CDN
- Check for CORS errors

### **3. Test Simple HTML**

Create `test-sql.html` in the `public` folder:

```html
<!DOCTYPE html>
<html>
<head>
    <title>SQL.js Test</title>
</head>
<body>
    <h1>SQL.js Test</h1>
    <div id="result"></div>
    
    <script src="https://sql.js.org/dist/sql-wasm.js"></script>
    <script>
        initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        }).then(SQL => {
            const db = new SQL.Database();
            db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);");
            db.run("INSERT INTO test (name) VALUES ('Hello World');");
            
            const stmt = db.prepare("SELECT * FROM test");
            const result = stmt.getAsObject();
            
            document.getElementById('result').innerHTML = 
                `Success! Result: ${JSON.stringify(result)}`;
        }).catch(error => {
            document.getElementById('result').innerHTML = 
                `Error: ${error.message}`;
        });
    </script>
</body>
</html>
```

Then visit: `http://localhost:3000/test-sql.html`

## 📞 **Still Having Issues?**

If none of these work, we can:
1. **Switch to a simpler approach** using localStorage + JSON
2. **Use a different database library** like Dexie.js
3. **Implement a hybrid approach** with basic offline storage

The offline functionality is more important than the specific technology! 