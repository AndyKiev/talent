import EmployeeList from "./components/employees/old/EmployeeList.tsx";
import "./App.css";
import {ThemeProvider} from "./components/theme/ThemeContext.tsx";

function App() {
    return (
        <ThemeProvider>
            <EmployeeList />
        </ThemeProvider>
    );
}

export default App;