
import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

function App() {
  // 사람 리스트 관리
  const initialPeople = useMemo(
    () => [
    ],
    []
  );

  const [people, setPeople] = useState([]);
  const [currentCollection, setCurrentCollection] = useState("people");

  const [counts, setCounts] = useState({
    total: 0,
    people: 0,
    lab: 0,
    normal: 0,
    salad: 0,
  });

  useEffect(() => {
  const colRef = collection(db, currentCollection);

  const unsub = onSnapshot(colRef, async (snap) => {
    // ✅ 처음 1번: DB에 사람이 12명 다 없으면 initialPeople로 채움
    if (snap.size < initialPeople.length) {
      // 현재 DB에 있는 id 목록
      const existingIds = new Set(snap.docs.map((d) => Number(d.id)));

      const missing = initialPeople.filter((p) => !existingIds.has(p.id));

      await Promise.all(
        missing.map((p) => setDoc(doc(colRef, String(p.id)), p, { merge: true }))
      );
    }

    // ✅ 실시간 반영
    const list = snap.docs
      .map((d) => d.data())
      .sort((a, b) => a.id - b.id);

    setPeople(list);
  });

  return () => unsub();
  }, [initialPeople, currentCollection]);

  useEffect(() => {
  const getStats = (snap) => {
    const docs = snap.docs.map((d) => d.data());

    return {
      total: docs.filter((d) => d.willEat && !d.onTrip).length,
      normal: docs.filter(
        (d) => d.willEat && !d.onTrip && d.mealType === "normal"
      ).length,
      salad: docs.filter(
        (d) => d.willEat && !d.onTrip && d.mealType === "salad"
      ).length,
    };
  };

  let peopleStats = {
    total: 0,
    normal: 0,
    salad: 0,
  };

  let labStats = {
    total: 0,
    normal: 0,
    salad: 0,
  };

  const updateCounts = () => {
    setCounts({
      people: peopleStats.total,
      lab: labStats.total,
      total: peopleStats.total + labStats.total,
      normal: peopleStats.normal + labStats.normal,
      salad: peopleStats.salad + labStats.salad,
    });
  };

  const unsubPeople = onSnapshot(collection(db, "people"), (snap) => {
    peopleStats = getStats(snap);
    updateCounts();
  });

  const unsubLab = onSnapshot(collection(db, "lab"), (snap) => {
    labStats = getStats(snap);
    updateCounts();
  });

  return () => {
    unsubPeople();
    unsubLab();
  };
}, []);

  // 오늘 날짜
  const formattedDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 식사 대상(출장 아닌 사람)만
  const mealPeople = useMemo(() => people.filter((p) => !p.onTrip), [people]);
  const tripPeople = useMemo(() => people.filter((p) => p.onTrip), [people]);

  
  // 먹겠다 토글 (출장자는 토글할 필요 없음)
//   const toggleWillEat = async (id, currentWillEat) => {
//     await updateDoc(doc(db, currentCollection, String(id)), {
//     willEat: !currentWillEat,
//   });
// };

  const selectMeal = async (id, mealType) => {
  await updateDoc(doc(db, currentCollection, String(id)), {
    willEat: true,
    mealType: mealType,
  });
};

  const cancelMeal = async (id) => {
    await updateDoc(doc(db, currentCollection, String(id)), {
      willEat: false,
      mealType: "",
    });
  };

  // 출장 시 식사 여부는 false로 변경
  const goTrip = async (id) => {
  await updateDoc(doc(db, currentCollection, String(id)), {
    onTrip: true,
    willEat: false,
    mealType: "",
    });
  };


  // 출장 복귀 시 다시 식사 리스트로 이동
  const returnFromTrip = async (id) => {
  await updateDoc(doc(db, currentCollection, String(id)), {
      onTrip: false,
    });
  };

  // 식사 대상을 기준으로 먹겠다 전체 초기화
  const resetAllWillEat = async () => {
  await Promise.all(
    people
      .filter((p) => !p.onTrip)
      .map((p) =>
        updateDoc(doc(db, currentCollection, String(p.id)), { willEat: false, mealType: ""})
        )
    );
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>
        {currentCollection === "people" ? "프로젝트팀" : "기술연구소"}
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setCurrentCollection("people")}>
          프로젝트팀
        </button>
        <button onClick={() => setCurrentCollection("lab")}>
          기술연구소
        </button>
      </div>
          
      {/* ✅ 식사 인원 문구 */}
      <div style={{ marginTop: 10, fontSize: 20 }}>
        {formattedDate} 식사 인원은 <strong>{counts.total}</strong>명 입니다.
      </div>

      <div style={{ marginTop: 6, fontSize: 15 }}>
  🍚 일반식 : <strong>{counts.normal}</strong>명
  {" / "}
  🥗 샐러드 : <strong>{counts.salad}</strong>명
</div>

      <div style={{ marginTop: 6, fontSize: 15, opacity: 0.8 }}>
        프로젝트팀: <strong>{counts.people}</strong>명 / 기술연구소:{" "}
        <strong>{counts.lab}</strong>명
      </div>


      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
        <button onClick={resetAllWillEat}>초기화</button>
        <span style={{fontSize : 14}}>오늘의 인원 체크 후 초기화 버튼을 눌러주세요.</span>
      </div>

      {/* ✅ 원래 리스트(식사 대상) */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "14px 0 10px" }}>식사 대상 리스트</h2>

        {mealPeople.length === 0 ? (
          <div style={{ opacity: 0.7 }}>현재 식사 대상자가 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {mealPeople.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 10,
                  gap: 12,
                }}
              >
                {/* 왼쪽: 출장 버튼 + 이름/상태 */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <strong style={{ fontSize: 16 }}>{p.name}</strong>

                    {p.willEat ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          width: "90px",
                          padding: "6px 6px",
                          borderRadius: 12,
                          fontWeight: 700,
                          fontSize: 16,
                          background:
                            p.mealType === "salad" ? "#DCFCE7" : "#FCE7F3",
                          color:
                            p.mealType === "salad" ? "#15803D" : "#DB2777",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>
                          {p.mealType === "salad" ? "🥗" : "🍚"}
                        </span>

                        {p.mealType === "salad" ? "샐러드" : "일반식"}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          // width: "fit-content",
                          padding: "6px 14px",
                          borderRadius: 12,
                          background: "#F3F4F6",
                          color: "#374151",
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        ❌ 
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => goTrip(p.id)}>출장✈️</button>|
                  <button onClick={() => selectMeal(p.id, "normal")}>
                    일반식🍚
                  </button>
                  <button onClick={() => selectMeal(p.id, "salad")}>
                    샐러드🥗
                  </button>
                  <button onClick={() => cancelMeal(p.id)}>
                    안먹어요❌
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ✅ 출장 인원 리스트 */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ margin: "14px 0 10px" }}>출장 간 인원</h2>

      <div style={{ opacity: 0.7, fontSize: 14, marginTop: 10, marginBottom: 10}}>
        출장자는 식사 인원 계산에서 제외됩니다.
      </div>

        {tripPeople.length === 0 ? (
          <div style={{ opacity: 0.7 }}>출장 중인 인원이 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tripPeople.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <strong>{p.name}</strong>
                <button onClick={() => returnFromTrip(p.id)}>출장 복귀</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
