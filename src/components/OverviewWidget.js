import React from 'react';

const OverviewWidget = ({ title, value, icon, bgColor, iconColor }) => {
    return (
        <div className={`rounded-lg shadow-md p-6 flex items-center justify-between ${bgColor}`}> 
            <div>
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`text-4xl ${iconColor}`}>  
                <i className={icon}></i>
            </div>
        </div>
    );
};

export default OverviewWidget;
