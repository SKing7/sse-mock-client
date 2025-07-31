import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CONFIG, getFullUrl } from "./config";

type MockDataItem = string;

const Popup = () => {
  const [mockData, setMockData] = useState<MockDataItem[]>([]);
  const [selectedMock, setSelectedMock] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedId, setCapturedId] = useState("");
  const [isMocking, setIsMocking] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // 获取mock数据列表
    fetchMockData();

    // 从存储中恢复状态
    restoreState();

    // 监听storage变化来接收捕获的ID
    const storageListener = (changes: any) => {
      console.log("popup storage chagne", changes);
      if (changes.capturedId && changes.capturedId.newValue) {
        const newId = changes.capturedId.newValue;
        setCapturedId(newId);
        setIsMocking(false);
        setStatus(`捕获到规则ID: ${newId}`);
        saveState("isMocking", false);
        console.log("[mock] capturedId from storage:", newId);
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  // 恢复保存的状态
  const restoreState = async () => {
    try {
      const result = await chrome.storage.local.get([
        "selectedMock",
        "isCapturing",
        "capturedId",
        "isMocking",
      ]);

      if (result.selectedMock) setSelectedMock(result.selectedMock);
      if (result.isCapturing !== undefined) setIsCapturing(result.isCapturing);
      if (result.capturedId) setCapturedId(result.capturedId);
      if (result.isMocking !== undefined) setIsMocking(result.isMocking);
    } catch (error) {
      console.error("Error restoring state:", error);
    }
  };

  // 保存状态到存储
  const saveState = async (key: string, value: any) => {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error("Error saving state:", error);
    }
  };

  const fetchMockData = async () => {
    try {
      const response = await fetch(
        getFullUrl(
          CONFIG.MOCK_SERVER.BASE_URL,
          CONFIG.MOCK_SERVER.ENDPOINTS.PRESET_DATA
        ),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          mode: "cors",
        }
      );
      if (response.ok) {
        const data = await response.json();
        const mockFiles = data.files;
        setMockData(mockFiles);
        if (mockFiles.length > 0) {
          setSelectedMock(mockFiles[0]);
          saveState("selectedMock", mockFiles[0]);
        }
      } else {
        const errorText = await response.text();
        console.error(
          "Fetch error:",
          response.status,
          response.statusText,
          errorText
        );
        setStatus(`服务器错误 ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setStatus("获取Mock数据失败");
      console.error("Error fetching mock data:", error);
    }
  };

  const toggleCapture = async () => {
    const newCapturingState = !isCapturing;
    setIsCapturing(newCapturingState);
    await saveState("isCapturing", newCapturingState);

    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab.id) {
        // 向content script发送消息
        await chrome.tabs.sendMessage(tab.id, {
          type: "toggleCapture",
          enabled: newCapturingState,
        });

        setStatus(newCapturingState ? "开始捕获Console日志..." : "停止捕获");

        if (!newCapturingState) {
          setCapturedId("");
          await saveState("capturedId", "");
        }
      }
    } catch (error) {
      console.error("Error toggling capture:", error);
      setStatus("切换捕获状态失败");
      setIsCapturing(!newCapturingState); // 回滚状态
      await saveState("isCapturing", !newCapturingState);
    }
  };

  const handleStartMocking = async () => {
    if (!capturedId) {
      setStatus("请先捕获规则ID");
      return;
    }

    if (!selectedMock) {
      setStatus("请选择Mock数据");
      return;
    }

    setIsMocking(true);
    await saveState("isMocking", true);
    setStatus("正在启动Mock...");

    try {
      console.log("[popup] Sending startMocking message...");

      const response = await chrome.runtime.sendMessage({
        type: "startMocking",
        payload: {
          action: "start",
          params: {
            conversationId: capturedId,
            presetData: selectedMock,
            speed: 5,
          },
        },
      });

      console.log("[popup] Received response:", response);

      if (response && response.success) {
        setStatus("Mock已启动");
      } else {
        setStatus(`Mock启动失败: ${response?.error || "未知错误"}`);
        setIsMocking(false);
        await saveState("isMocking", false);
      }
    } catch (error) {
      console.error("[popup] Error starting mock:", error);
      setStatus(`Mock启动失败: ${error.message}`);
      setIsMocking(false);
      await saveState("isMocking", false);
    }
  };

  const handleStopMocking = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "stopMocking",
      });

      if (response && response.success) {
        setIsMocking(false);
        await saveState("isMocking", false);
        setStatus("Mock已停止");
      } else {
        setStatus("停止Mock失败");
      }
    } catch (error) {
      console.error("Error stopping mock:", error);
      setStatus("停止Mock失败");
    }
  };

  return (
    <div style={{ padding: "16px", width: "300px" }}>
      <h2>SSE Mock</h2>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          选择 Mock 数据:
        </label>
        <select
          value={selectedMock}
          onChange={(e) => {
            setSelectedMock(e.target.value);
            saveState("selectedMock", e.target.value);
          }}
          style={{ width: "100%", padding: "4px" }}
        >
          {mockData.map((data) => (
            <option key={data} value={data}>
              {data}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={isCapturing}
            onChange={toggleCapture}
          />
          捕获 Console Log
        </label>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          捕获的规则ID:
        </label>
        <input
          type="text"
          value={capturedId}
          onChange={(e) => {
            setCapturedId(e.target.value);
            saveState("capturedId", e.target.value);
          }}
          placeholder="等待捕获或手动输入..."
          style={{ width: "100%", padding: "4px" }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        {!isMocking ? (
          <button
            onClick={handleStartMocking}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            开始 Mock
          </button>
        ) : (
          <button
            onClick={handleStopMocking}
            style={{
              width: "100%",
              padding: "8px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            停止 Mock
          </button>
        )}
      </div>

      {status && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "#f0f0f0",
            borderRadius: "4px",
            fontSize: "12px",
            wordBreak: "break-word",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
